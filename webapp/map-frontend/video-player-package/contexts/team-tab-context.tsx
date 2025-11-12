"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export type TeamTab = 'overview' | 'members' | 'videos' | 'games' | 'public-matches';

interface TeamTabContextType {
  activeTab: TeamTab;
  setActiveTab: (tab: TeamTab) => void;
}

const TeamTabContext = createContext<TeamTabContextType | undefined>(undefined);

export const useTeamTab = () => {
  const context = useContext(TeamTabContext);
  if (context === undefined) {
    throw new Error('useTeamTab must be used within a TeamTabProvider');
  }
  return context;
};

interface TeamTabProviderProps {
  children: ReactNode;
}

export const TeamTabProvider: React.FC<TeamTabProviderProps> = ({ children }) => {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TeamTab>('games');

  // Sync active tab with current URL
  useEffect(() => {
    if (pathname.includes('/games')) {
      setActiveTab('games');
    } else if (pathname.includes('/team') || pathname.includes('/overview')) {
      setActiveTab('overview');
    }
  }, [pathname]);

  const value: TeamTabContextType = {
    activeTab,
    setActiveTab,
  };

  return <TeamTabContext.Provider value={value}>{children}</TeamTabContext.Provider>;
}; 