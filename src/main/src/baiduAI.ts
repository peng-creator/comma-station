const https = require('follow-redirects').https;

export const askAI = (accessToken: string, conversations: any) => {
    return new Promise((resolve, reject) => {
        const options = {
            'method': 'POST',
            'hostname': 'aip.baidubce.com',
            'path': '/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro?access_token=' + accessToken,
            'headers': {
                'Content-Type': 'application/json'
            },
            'maxRedirects': 20
            };
        
        const req = https.request(options, function (res: any) {
            const chunks: any = [];
    
            res.on("data", function (chunk: any) {
                chunks.push(chunk);
            });
    
            res.on("end", function () {
                const body = Buffer.concat(chunks);
                resolve(body.toString());
            });
    
            res.on("error", function (error: any) {
                reject(error);
            });
        });
    
        const postData = JSON.stringify(conversations);
    
        req.write(postData);
    
        req.end();
    });
}