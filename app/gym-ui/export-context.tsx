"use client";
import {createContext,useContext,type ReactNode} from 'react';
import type {PdfMeta} from './pdf';
const Context=createContext<PdfMeta>({gymName:'MUSCLE T FITNESS GYM'});
export function ExportProvider({meta,children}:{meta:PdfMeta;children:ReactNode}){return <Context.Provider value={meta}>{children}</Context.Provider>}
export const useExportMeta=()=>useContext(Context);
