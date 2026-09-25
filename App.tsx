
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, FolderKanban, Users, Truck, Settings, FileText, Bell, LogOut, Menu,
  X, Check, AlertCircle, AlertTriangle, Info, Trash2, Loader2, Maximize2, Minimize2, Upload,
  ShieldCheck, UserCircle, RefreshCw, HardDrive
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import CaseManagement from './components/CaseManagement';
import AppSettings from './components/AppSettings';
import Finance from './components/Finance';
import VehicleManagement from './components/VehicleManagement';
import UserManagement from './components/UserManagement';
import GoogleDriveManager from './components/GoogleDriveManager';
import SplashScreen from './components/SplashScreen';
import LoginModeSelection, { SelectedModePayload } from './components/LoginModeSelection';
import GoldenAmountWidget from './components/GoldenAmountWidget';
import ClientPortal from './components/ClientPortal';
import { LoadingPortStaffPortal } from './components/LoadingPortStaffPortal';
import { ModeOption } from './components/TopModeSwitcher';
import { AppNotification, UserRole } from './types';
import NotificationModal from './components/NotificationModal';
import AuthModal from './components/AuthModal';
import Logo from './components/Logo';
import { auth, onAuthStateChanged, testFirestoreConnection } from './services/firebase';
import { subscribeToNotifications } from './services/dbService';
import { approveActionRequest, rejectActionRequest } from './services/approvalService';
import { safeSessionStorage, safeLocalStorage, safeAppStorage } from './services/storage';
import ErrorBoundary from './components/ErrorBoundary';
import { appLifecycle } from './services/lifecycle';
import { useBranding } from './services/brandingService';

const App: React.FC = () => {
  // Splash Screen & Login Area State:
  // On every app start, reload, or browser refresh:
  // 1. Splash screen ALWAYS displays first
  // 2. Once splash finishes, the Login / Portal Selection screen ALWAYS appears
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [showModeSelection, setShowModeSelection] = useState<boolean>(false);
  const [isReplaySplashOnly, setIsReplaySplashOnly] = useState<boolean>(false);
  const { customLogo, companyName } = useBranding();

  // Role State (Preserved across app switching and backgrounding)
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = safeAppStorage.getItem('dpl_user_role');
    return (saved as UserRole) || UserRole.ADMIN;
  });
  const [currentRoles, setCurrentRoles] = useState<UserRole[]>(() => {
    const saved = safeAppStorage.getItem('dpl_user_roles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn("Could not parse saved roles:", e);
      }
    }
    const single = safeAppStorage.getItem('dpl_user_role') as UserRole;
    return single ? [single] : [UserRole.ADMIN];
  });
  const [currentDesignation, setCurrentDesignation] = useState<string>(() => {
    return safeAppStorage.getItem('dpl_user_designation') || '';
  });
  const [currentClientName, setCurrentClientName] = useState(() => {
    return safeAppStorage.getItem('dpl_client_name') || '';
  });

  // Session Toast for workflow restoration feedback
  const [sessionToast, setSessionToast] = useState<string | null>(null);

  useEffect(() => {
    if (sessionToast) {
      const timer = setTimeout(() => setSessionToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [sessionToast]);

  useEffect(() => {
    safeAppStorage.setItem('dpl_user_role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    safeAppStorage.setItem('dpl_client_name', currentClientName);
  }, [currentClientName]);

  // Layout State (Preserve activeView across tab backgrounding/reloads/multitasking)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(true);
  const [activeView, setActiveView] = useState(() => {
    return safeAppStorage.getItem('dpl_active_view') || 'dashboard';
  });
  const [navigationFilter, setNavigationFilter] = useState<any>(null);

  // Update storage whenever activeView changes
  useEffect(() => {
    safeAppStorage.setItem('dpl_active_view', activeView);
    safeAppStorage.setItem('dpl_last_location_view', activeView);
    safeAppStorage.setItem('dpl_last_location_role', currentRole);
  }, [activeView, currentRole]);

  // Listen to lifecycle events for multitasking stability
  useEffect(() => {
    const unsubscribe = appLifecycle.subscribe((lifecycleState) => {
      if (lifecycleState === 'background') {
        // Flush critical navigation states
        safeAppStorage.setItem('dpl_active_view', activeView);
        safeAppStorage.setItem('dpl_last_location_view', activeView);
        safeAppStorage.setItem('dpl_last_location_role', currentRole);
        safeAppStorage.setItem('dpl_user_role', currentRole);
        safeAppStorage.setItem('dpl_client_name', currentClientName);
      }
    });
    return () => unsubscribe();
  }, [activeView, currentRole, currentClientName]);

  // Action Center State
  const [isActionCenterOpen, setIsActionCenterOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // Firebase Auth & Cloud Sync State
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [firestoreConnected, setFirestoreConnected] = useState(true);
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Admin Navigation Items (Dashboard removed from sidebar; clicking Logo at top opens Dashboard)
  const adminNavItems = [
    { id: 'cases', label: 'Case Management', icon: FolderKanban },
    { id: 'drive', label: 'Google Drive', icon: HardDrive },
    { id: 'finance', label: 'Finance', icon: FileText },
    { id: 'vehicles', label: 'Vehicles', icon: Truck },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Client Role Navigation Items (ONLY Cases and Finance as requested)
  const clientNavItems = [
    { id: 'cases', label: 'Cases & Shipments', icon: FolderKanban },
    { id: 'finance', label: 'Finance & Invoices', icon: FileText },
  ];

  // Dynamic navigation items based on active portal mode & multi-roles
  const currentNavItems = (() => {
    const isAdminUser = currentRoles.includes(UserRole.ADMIN) || currentRole === UserRole.ADMIN;
    if (isAdminUser) {
      return adminNavItems;
    }
    if (currentRole === UserRole.CLIENT) {
      return clientNavItems;
    }
    if (currentRole === UserRole.TRANSPORTER) {
      return [
        { id: 'vehicles', label: 'Fleet & Vehicles', icon: Truck },
        { id: 'cases', label: 'Assigned Shipments', icon: FolderKanban },
      ];
    }

    const items: Array<{ id: string; label: string; icon: any }> = [];

    const hasCasesAccess = currentRoles.includes(UserRole.OPERATIONS_MANAGER) || 
                           currentRoles.includes(UserRole.LOADING_PORT_STAFF) || 
                           currentRoles.includes(UserRole.UNLOADING_PORT_STAFF) ||
                           currentRoles.includes(UserRole.DESTINATION_PORT_STAFF) ||
                           currentRoles.includes(UserRole.OFFICE_STAFF);
    const hasFinanceAccess = currentRoles.includes(UserRole.FINANCE_MANAGER);
    const hasVehiclesAccess = currentRoles.includes(UserRole.VEHICLE_MANAGER);

    if (hasCasesAccess) {
      items.push({ id: 'cases', label: 'Case Management', icon: FolderKanban });
    }
    if (hasFinanceAccess) {
      items.push({ id: 'finance', label: 'Finance & Accounts', icon: FileText });
    }
    if (hasVehiclesAccess) {
      items.push({ id: 'vehicles', label: 'Fleet & Vehicles', icon: Truck });
    }

    if (items.length === 0) {
      return [{ id: 'cases', label: 'Case Management', icon: FolderKanban }];
    }

    return items;
  })();

  const handleSwitchMode = (mode: ModeOption) => {
    setCurrentRole(mode.role);
    setActiveView(mode.targetView);
    setNavigationFilter(null);
    setMobileSidebarOpen(false);
  };

  const handleSignOut = () => {
    try {
      auth.signOut().catch(() => {});
    } catch (e) {}
    // Preserve current location before logging out so user can be restored on next login
    safeAppStorage.setItem('dpl_last_location_view', activeView);
    safeAppStorage.setItem('dpl_last_location_role', currentRole);
    safeAppStorage.removeItem('dpl_session_active');
    setShowSplash(false);
    setShowModeSelection(true);
  };

  useEffect(() => {
    // Test Firestore database connection on boot
    testFirestoreConnection().then((connected) => {
      setFirestoreConnected(connected);
    }).catch(() => {
      setFirestoreConnected(false);
    });

    // Listen to Firebase Authentication State
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });

    // Listen to live notifications from Firestore
    const unsubNotifs = subscribeToNotifications((items) => {
      setNotifications(items || []);
    });

    // Prevent accidental browser page navigation / app reload when dragging files into window
    const preventFileDropNavigation = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragenter', preventFileDropNavigation, false);
    window.addEventListener('dragover', preventFileDropNavigation, false);
    window.addEventListener('drop', preventFileDropNavigation, false);
    document.addEventListener('dragenter', preventFileDropNavigation, false);
    document.addEventListener('dragover', preventFileDropNavigation, false);
    document.addEventListener('drop', preventFileDropNavigation, false);

    return () => {
      window.removeEventListener('dragenter', preventFileDropNavigation);
      window.removeEventListener('dragover', preventFileDropNavigation);
      window.removeEventListener('drop', preventFileDropNavigation);
      document.removeEventListener('dragenter', preventFileDropNavigation);
      document.removeEventListener('dragover', preventFileDropNavigation);
      document.removeEventListener('drop', preventFileDropNavigation);
      unsubAuth();
      unsubNotifs();
    };
  }, []);

  const handleNavigate = (viewId: string, filterData: any) => {
    setActiveView(viewId);
    setNavigationFilter(filterData ? { ...filterData } : null);
  };

  const handleActionComplete = (notificationId: number) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (notifications.length <= 1) setIsActionCenterOpen(false);
  };

  const handleNotificationClick = (notification: AppNotification) => {
    setSelectedNotification(notification);
    setIsNotificationModalOpen(true);
  };

  const handleNotificationAction = async (action: 'ACCEPT' | 'REJECT' | 'VIEW') => {
    if (!selectedNotification) return;

    if (action === 'VIEW') {
      if (selectedNotification.targetView) {
        handleNavigate(selectedNotification.targetView, { ...selectedNotification.targetFilter, notificationId: selectedNotification.id });
      }
      setIsNotificationModalOpen(false);
      setIsActionCenterOpen(false);
    } else if (action === 'ACCEPT') {
      try {
        await approveActionRequest(selectedNotification);
      } catch (err) {
        console.error("Failed to approve action request:", err);
      }
      handleActionComplete(selectedNotification.id);
      setIsNotificationModalOpen(false);
    } else if (action === 'REJECT') {
      try {
        await rejectActionRequest(selectedNotification);
      } catch (err) {
        console.error("Failed to reject action request:", err);
      }
      handleActionComplete(selectedNotification.id);
      setIsNotificationModalOpen(false);
    }
  };

  const renderContent = () => {
    // If in Client Role, directly render the dedicated Client Portal
    if (currentRole === UserRole.CLIENT) {
      return (
        <ClientPortal 
          customLogo={customLogo} 
          currentClientName={currentClientName}
          onSwitchMode={handleSwitchMode}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onSignOut={handleSignOut}
          onSwitchToAdmin={() => {
            setCurrentRole(UserRole.ADMIN);
            setActiveView('dashboard');
          }} 
        />
      );
    }

    // Route Loading Port Staff and Destination / Unloading Staff directly to their dedicated workspace
    if (
      currentRole === UserRole.LOADING_PORT_STAFF || 
      currentRole === UserRole.UNLOADING_PORT_STAFF || 
      currentRole === UserRole.DESTINATION_PORT_STAFF
    ) {
      return (
        <LoadingPortStaffPortal 
          onSignOut={handleSignOut}
          userRole={currentRole}
          userRoles={currentRoles}
          staffUserId={safeAppStorage.getItem('dpl_current_user_id') || 'mohsin'}
          staffUserName={safeAppStorage.getItem('dpl_current_user_name') || 'Mohsin Khan'}
        />
      );
    }

    switch(activeView) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} />;
      case 'cases': return <CaseManagement initialFilter={navigationFilter} clearFilter={() => setNavigationFilter(null)} onActionComplete={handleActionComplete} customLogo={customLogo} userRole={currentRole} userRoles={currentRoles} currentClientName={currentClientName} />;
      case 'drive': return <GoogleDriveManager />;
      case 'finance': return <Finance initialFilter={navigationFilter} onActionComplete={handleActionComplete} customLogo={customLogo} />;
      case 'vehicles': return <VehicleManagement initialFilter={navigationFilter} clearFilter={() => setNavigationFilter(null)} userRole={currentRole} userRoles={currentRoles} />;
      case 'users': return <UserManagement />;
      case 'settings': return <AppSettings onReplaySplash={() => { setIsReplaySplashOnly(true); setShowSplash(true); }} />;
      default: return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  if (showSplash) {
    return (
      <ErrorBoundary>
        <SplashScreen 
          onComplete={() => {
            setShowSplash(false);
            if (isReplaySplashOnly) {
              setIsReplaySplashOnly(false);
            } else {
              setShowModeSelection(true);
            }
          }} 
        />
      </ErrorBoundary>
    );
  }

  if (showModeSelection) {
    return (
      <ErrorBoundary>
        <LoginModeSelection 
          onSelectMode={(payload: SelectedModePayload) => {
            setCurrentRole(payload.role);
            const roles = payload.roles && payload.roles.length > 0 ? payload.roles : [payload.role];
            setCurrentRoles(roles);
            if (payload.designation) {
              setCurrentDesignation(payload.designation);
              safeAppStorage.setItem('dpl_user_designation', payload.designation);
            }
            safeAppStorage.setItem('dpl_user_roles', JSON.stringify(roles));

            if (payload.clientName) {
              setCurrentClientName(payload.clientName);
              safeAppStorage.setItem('dpl_client_name', payload.clientName);
            }

            const lastLocationView = safeAppStorage.getItem('dpl_last_location_view');
            const lastLocationRole = safeAppStorage.getItem('dpl_last_location_role');

            let targetView = payload.targetView;
            if (lastLocationView && (lastLocationRole === payload.role || payload.role === UserRole.ADMIN) && lastLocationView !== 'settings') {
              targetView = lastLocationView;
            }

            setActiveView(targetView);
            safeAppStorage.setItem('dpl_user_role', payload.role);
            safeAppStorage.setItem('dpl_active_view', targetView);
            safeAppStorage.setItem('dpl_last_location_view', targetView);
            safeAppStorage.setItem('dpl_last_location_role', payload.role);
            safeAppStorage.setItem('dpl_session_active', 'true');
            setShowModeSelection(false);
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full bg-transparent text-gray-100 font-sans overflow-hidden relative">
        
        {/* Sidebar Overlay for Mobile */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setMobileSidebarOpen(false)}></div>
      )}
      
      {/* Action Center Overlay */}
      {isActionCenterOpen && (
        <div 
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" 
            onClick={() => setIsActionCenterOpen(false)}
        ></div>
      )}

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={isNotificationModalOpen}
        notification={selectedNotification}
        onClose={() => setIsNotificationModalOpen(false)}
        onAction={handleNotificationAction}
      />

      {/* Action Center Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-50 transform transition-transform duration-300 shadow-2xl flex flex-col ${isActionCenterOpen ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900">
          <h3 className="font-semibold text-lg text-white flex items-center gap-2"><Bell size={20} className="text-brand-400" /> Action Center</h3>
          <button onClick={() => setIsActionCenterOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {notifications.map(n => (
            <div 
                key={n.id} 
                onClick={() => handleNotificationClick(n)}
                className="p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
            >
              <h4 className="text-sm font-semibold text-gray-200 group-hover:text-brand-300 transition-colors">{n.title}</h4>
              <p className="text-xs text-gray-400 mt-1">{n.description}</p>
              {n.actionLabel && (
                  <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        handleNotificationClick(n);
                    }}
                    className="w-full mt-3 bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium py-2 rounded-lg transition-colors shadow-lg shadow-brand-600/20"
                  >
                      {n.actionLabel}
                  </button>
              )}
            </div>
          ))}
          {notifications.length === 0 && (
             <div className="text-center text-gray-500 py-10">
                 <Check size={48} className="mx-auto mb-2 opacity-50" />
                 <p>All caught up!</p>
             </div>
          )}
        </div>
      </div>

      {/* Main Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-slate-950/70 backdrop-blur-xl border-r border-white/5 transition-all duration-300 flex flex-col z-30 ${mobileSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'} lg:static lg:translate-x-0 lg:h-auto ${desktopSidebarExpanded ? 'lg:w-64' : 'lg:w-20'}`}>
        
        {/* Click Logo at Top of Sidebar to Open Dashboard */}
        <div 
          onClick={() => {
            setActiveView('dashboard');
            setNavigationFilter(null);
            setMobileSidebarOpen(false);
          }}
          className="h-auto py-4 flex flex-col items-center justify-center border-b border-white/5 px-3 overflow-hidden gap-2 cursor-pointer hover:opacity-90 active:scale-95 transition-all group select-none"
          title="DOCKS Dashboard"
        >
          {/* Full Logo - Shown when sidebar is expanded OR on mobile */}
          <div className={`${!desktopSidebarExpanded ? 'lg:hidden' : ''} flex items-center justify-center`}>
            <Logo className="h-10 w-auto max-w-[180px] group-hover:brightness-110 transition-all" />
          </div>
          
          {/* Icon Logo - Shown ONLY when sidebar is collapsed on desktop */}
          <div className={`${desktopSidebarExpanded ? 'hidden' : 'hidden lg:flex'} items-center justify-center`}>
            <Logo variant="icon" className="h-8 w-auto max-w-[48px] group-hover:brightness-110 transition-all" />
          </div>

          {/* Client Role Badge in Sidebar */}
          {currentRole === UserRole.CLIENT && (
            <div className={`mt-1 text-center ${!desktopSidebarExpanded && 'lg:hidden'}`}>
              <span className="bg-brand-500/20 text-brand-300 text-[11px] px-2.5 py-0.5 rounded-full border border-brand-500/30 font-medium">
                Client Portal
              </span>
            </div>
          )}
        </div>

        {/* Navigation items (Strictly Cases & Finance only for Client) */}
        <nav className="flex-1 py-6 space-y-1 px-3">
          {currentNavItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => { 
                setActiveView(item.id); 
                setNavigationFilter(null); 
                setMobileSidebarOpen(false); 
              }} 
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                activeView === item.id 
                  ? 'bg-brand-600/20 text-white border border-brand-500/20 shadow-lg shadow-brand-500/10' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              } ${!desktopSidebarExpanded && 'lg:justify-center'}`}
            >
              <item.icon size={22} className={`${activeView === item.id ? 'text-brand-400' : 'text-gray-500'} group-hover:text-white`} />
              <span className={`${!desktopSidebarExpanded && 'lg:hidden'} font-medium`}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Active Session Info */}
        <div className={`px-3 py-2 border-t border-white/5 ${!desktopSidebarExpanded && 'lg:hidden'}`}>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="min-w-0 flex-1">
              {currentDesignation && (
                <span className="text-[10px] text-brand-300 font-medium block truncate">
                  {currentDesignation}
                </span>
              )}
              <span className="text-[10px] text-amber-400 font-mono uppercase block truncate">
                {currentRoles && currentRoles.length > 1 
                  ? `${currentRoles.length} Roles Assigned` 
                  : `Role: ${currentRole}`}
              </span>
              <span className="text-[11px] text-gray-300 font-bold block truncate">
                {currentRole === UserRole.CLIENT ? currentClientName : 'Active User'}
              </span>
            </div>
          </div>
        </div>

        {/* Logout at Sidebar Bottom */}
        <div className="p-3 border-t border-white/5">
          <button 
            type="button"
            onClick={handleSignOut}
            className={`w-full flex items-center gap-3 text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg transition text-xs ${!desktopSidebarExpanded && 'lg:justify-center'}`}
            title="Sign Out"
          >
            <LogOut size={16} /> <span className={`${!desktopSidebarExpanded && 'lg:hidden'}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-hidden relative">
        <header className="h-14 sm:h-16 bg-slate-900/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-3 sm:px-6 z-10 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <button onClick={() => window.innerWidth < 1024 ? setMobileSidebarOpen(!mobileSidebarOpen) : setDesktopSidebarExpanded(!desktopSidebarExpanded)} className="text-gray-400 hover:text-white p-1">
              <Menu size={22} />
            </button>

            {/* Click Logo on Top Header to open Dashboard */}
            <button
              type="button"
              onClick={() => {
                setActiveView('dashboard');
                setNavigationFilter(null);
              }}
              className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
              title="DOCKS Dashboard"
            >
              <Logo variant="icon" className="h-7 w-auto max-w-[36px]" />
            </button>

            {/* View Title - ONLY shown for inner views (Cases, Finance, Vehicles, Users, Settings). NEVER show "Dashboard" or "Admin Portal" when on dashboard */}
            {activeView !== 'dashboard' && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-gray-100 capitalize tracking-wide">
                  {currentRole === UserRole.CLIENT ? 'Client Portal' : activeView.replace('-', ' ')}
                </h2>
                {currentRole === UserRole.CLIENT && (
                  <span className="bg-brand-500/20 text-brand-300 text-[10px] sm:text-xs px-2 py-0.5 rounded-full border border-brand-500/30 font-medium">
                    {currentClientName}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Sone se Amount Option (Golden Amount Display & Treasury Breakdown) */}
            <GoldenAmountWidget 
              onOpenFinance={() => setActiveView('finance')}
            />

            {/* Notifications Bell */}
            <button 
              type="button"
              onClick={() => setIsActionCenterOpen(!isActionCenterOpen)} 
              className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition"
              title="Notifications"
            >
              <Bell size={18} />
              {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-slate-900 animate-pulse"></span>}
            </button>

            {/* Small Squircle (rounded-square) Sign Out Button with LogOut Logo */}
            <button
              type="button"
              id="header-signout-btn"
              onClick={handleSignOut}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-red-500/20 active:scale-95 cursor-pointer flex-shrink-0"
              title="Sign Out"
            >
              <LogOut size={17} className="text-red-400" />
            </button>

          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6 pb-32 sm:pb-12 custom-scrollbar overscroll-contain">
          {renderContent()}
        </div>

        {/* Session & Draft Restoration Toast Banner */}
        {sessionToast && (
          <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900/95 border border-amber-400/50 text-amber-200 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
              <span className="leading-snug">{sessionToast}</span>
            </div>
            <button 
              type="button"
              onClick={() => setSessionToast(null)} 
              className="text-gray-400 hover:text-white text-xs p-1 rounded-lg hover:bg-white/10 transition"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Firebase Authentication Modal */}
        <AuthModal 
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={firebaseUser}
          currentRole={currentRole}
          onRoleChange={(role) => setCurrentRole(role)}
        />
      </main>
    </div>
    </ErrorBoundary>
  );
};

export default App;

