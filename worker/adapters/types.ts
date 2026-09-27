export type NormalizedVideo={externalId:string;title:string;description?:string;thumbnailUrl?:string;originalUrl:string;creator?:string;duration?:number;publishedAt?:string;viewCount?:number;downloadUrl?:string;downloadAllowed?:boolean};
export interface SourceAdapter{getLatestVideos():Promise<NormalizedVideo[]>;getVideoDetails?(id:string):Promise<NormalizedVideo>;validateConfiguration():Promise<{ok:boolean;message?:string}>}
export type AdapterFactory=(config:Record<string,unknown>,env:Env)=>SourceAdapter;
