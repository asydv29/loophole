import type {AdapterFactory} from './types';
// Intentionally non-operational. Register only an adapter backed by a source-authorized API/feed.
export const disabledExampleAdapter:AdapterFactory=()=>({async getLatestVideos(){return []},async validateConfiguration(){return {ok:false,message:'No authorized integration configured.'}}});
