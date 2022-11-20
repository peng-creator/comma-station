import { Subtitle } from "../types/Subtitle";

const mergeSubtitles = (subtitleA: Subtitle, subtitleB: Subtitle) => {
    const maxLength = Math.max(
        subtitleA.subtitles.length,
        subtitleB.subtitles.length
    );
    const mergeSubtitles = [];
    for (let i = 0; i < maxLength; i += 1) {
        const a = subtitleA.subtitles[i] || '';
        const b = subtitleB.subtitles[i] || '';
        mergeSubtitles.push(`${a} ${b}`);
    }
    return {
        id: subtitleA.id,
        start: subtitleA.start,
        end: subtitleB.end,
        subtitles: mergeSubtitles,
    };
};

export const mergeWithComma = (subtitles: Subtitle[]) => {
    return subtitles.reduce((acc, curr) => {
        let last = acc[acc.length - 1];
        let shouldMerge =
            last &&
            last.subtitles.find((s: string) =>
                s.trim().endsWith(",")
            ) !== undefined;
        if (shouldMerge) {
            const merged = mergeSubtitles(last, curr);
            last.end = merged.end;
            last.subtitles = merged.subtitles;
        } else {
            acc.push(curr);
        }
        return acc;
    }, [] as Subtitle[]);
};

export const mergeNonePunctuations = (subtitles: Subtitle[]) => {
    // 检测字幕是否使用.和,
    const endwithPunctuationFound = subtitles.find((s) => {
        const endwithPunctuation = s.subtitles.find(s => s.endsWith('.') || s.endsWith(','));
        return endwithPunctuation !== undefined;
    }) !== undefined;
    if (!endwithPunctuationFound) {
        return subtitles;
    }
    /**
         *  P：标点字符；
            L：字母； 
            M：标记符号（一般不会单独出现）； 
            Z：分隔符（比如空格、换行等）； 
            S：符号（比如数学符号、货币符号等）； 
            N：数字（比如阿拉伯数字、罗马数字等）； 
            C：其他字符 
        */
    return subtitles.reduce((acc, curr) => {
        let last = acc[acc.length - 1];
        let shouldMerge =
            last &&
            last.subtitles.every(
                (s: string) => /\p{L}$/u.test(s.trim()) // 以字结尾
            );
        if (shouldMerge) {
            const merged = mergeSubtitles(last, curr);
            last.end = merged.end;
            last.subtitles = merged.subtitles;
        } else {
            acc.push(curr);
        }
        return acc;
    }, [] as Subtitle[]);
}