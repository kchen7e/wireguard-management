'use client';

import { createContext, useContext } from 'react';
import { EN_GB } from './intl';

export const AppContext = createContext({
    intl: EN_GB,
    instances: [],
    refreshInstances: () => {},
});

export const useApp = () => useContext(AppContext);
