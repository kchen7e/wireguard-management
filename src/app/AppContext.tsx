'use client';

import { createContext, useContext } from 'react';
import { EN_GB } from './intl';
import type { Messages } from './intl';
import type { Client, Instance } from './types';

export interface CreateInstanceInput {
    containerName: string;
    serverVpnIp: string;
    serverEndpoint: string;
    dns?: string | null;
}

export interface AddClientInput {
    description: string;
    clientIp: string;
}

export interface AppContextValue {
    intl: Messages;
    locale: string;
    instances: Instance[];
    instancesById: Record<string, Instance>;
    clientsByInstance: Record<string, Client[]>;
    refreshInstances: () => Promise<void>;
    loadInstance: (id: string) => Promise<Instance>;
    loadClients: (instanceId: string | number) => Promise<Client[]>;
    addClient: (instanceId: string | number, values: AddClientInput) => Promise<Client>;
    updateClient: (clientId: string | number, values: { description: string }) => Promise<Client>;
    deleteClient: (clientId: string | number) => Promise<void>;
    createInstance: (values: CreateInstanceInput) => Promise<Instance>;
}

const defaultValue: AppContextValue = {
    intl: EN_GB,
    locale: 'en-GB',
    instances: [],
    instancesById: {},
    clientsByInstance: {},
    refreshInstances: async () => {},
    loadInstance: async () => {
        throw new Error('loadInstance used outside AppProvider');
    },
    loadClients: async () => [],
    addClient: async () => {
        throw new Error('addClient used outside AppProvider');
    },
    updateClient: async () => {
        throw new Error('updateClient used outside AppProvider');
    },
    deleteClient: async () => {},
    createInstance: async () => {
        throw new Error('createInstance used outside AppProvider');
    },
};

export const AppContext = createContext<AppContextValue>(defaultValue);

export const useApp = (): AppContextValue => useContext(AppContext);
