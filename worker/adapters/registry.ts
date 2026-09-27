import type {AdapterFactory} from './types';
const registry=new Map<string,AdapterFactory>();
export function registerAdapter(name:string,factory:AdapterFactory){registry.set(name,factory)}
export function getAdapter(name:string){return registry.get(name)}
export function listAdapters(){return [...registry.keys()]}
