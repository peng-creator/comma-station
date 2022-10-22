export type ZoneType = 'dict' | 'pdf' | 'video' | 'cardMaker' | 'subtitle' | 'youtube';

export type ZoneDefinition = {
  id: string | number;
  type: ZoneType;
  data: any;
  title: string;
  registerTimeStamp: number;
};
