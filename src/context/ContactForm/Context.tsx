// contexts/ContactFormContext.tsx
import { createContext } from 'react';
import { ContextType } from './types';
export default createContext<ContextType | undefined>(undefined);
