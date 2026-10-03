'use client';

import { createContext, useContext } from 'react';
import { EN_GB } from './intl';

export const AppContext = createContext({
    intl: EN_GB,
    locale: 'en-GB',
    instances: [],
    instancesById: {},
    clientsByInstance: {},
    refreshInstances: () => {},
    loadInstance: () => {},
    loadClients: () => {},
    addClient: () => {},
    updateClient: () => {},
    deleteClient: () => {},
    createInstance: () => {},
});

export const useApp = () => useContext(AppContext);
