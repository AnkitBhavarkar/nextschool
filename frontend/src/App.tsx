import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import { apiClient } from './api/client';
import { User } from './types';
import { LoginPage } from './pages/LoginPage';
import { TeacherHome } from './pages/TeacherHome';
import { TeacherHistoryPage } from './pages/TeacherHistoryPage';
import { AdminHome } from './pages/AdminHome';
import { AdminTeachersPage } from './pages/AdminTeachersPage';
import { AdminStudentsPage } from './pages/AdminStudentsPage';
import { AdminMessagesPage } from './pages/AdminMessagesPage';
import { AdminWhatsAppConnectPage } from './pages/AdminWhatsAppConnectPage';
import { AdminImportDataPage } from './pages/AdminImportDataPage';
import { MainLayout } from './components/Layout/MainLayout';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await apiClient.get('/auth/me');
        setCurrentUser(res.data);
      } catch (e) {
        setCurrentUser(null);
      } finally {
        setInitializing(false);
      }
    };
    checkAuth();
  }, []);

  if (initializing) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip="Connecting to NextSchool Secure Portal..." />
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              currentUser ? (
                <Navigate to={currentUser.role === 'admin' ? '/admin' : '/teacher'} replace />
              ) : (
                <LoginPage onLoginSuccess={(u) => setCurrentUser(u)} />
              )
            }
          />

          {/* Teacher Routes */}
          <Route
            path="/teacher"
            element={
              currentUser && currentUser.role === 'teacher' ? (
                <MainLayout user={currentUser} onLogout={() => setCurrentUser(null)}>
                  <TeacherHome />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/teacher/history"
            element={
              currentUser && currentUser.role === 'teacher' ? (
                <MainLayout user={currentUser} onLogout={() => setCurrentUser(null)}>
                  <TeacherHistoryPage />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              currentUser && currentUser.role === 'admin' ? (
                <MainLayout user={currentUser} onLogout={() => setCurrentUser(null)}>
                  <AdminHome />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/admin/whatsapp-connect"
            element={
              currentUser && currentUser.role === 'admin' ? (
                <MainLayout user={currentUser} onLogout={() => setCurrentUser(null)}>
                  <AdminWhatsAppConnectPage />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/admin/import-data"
            element={
              currentUser && currentUser.role === 'admin' ? (
                <MainLayout user={currentUser} onLogout={() => setCurrentUser(null)}>
                  <AdminImportDataPage />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/admin/teachers"
            element={
              currentUser && currentUser.role === 'admin' ? (
                <MainLayout user={currentUser} onLogout={() => setCurrentUser(null)}>
                  <AdminTeachersPage />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/admin/students"
            element={
              currentUser && currentUser.role === 'admin' ? (
                <MainLayout user={currentUser} onLogout={() => setCurrentUser(null)}>
                  <AdminStudentsPage />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/admin/messages"
            element={
              currentUser && currentUser.role === 'admin' ? (
                <MainLayout user={currentUser} onLogout={() => setCurrentUser(null)}>
                  <AdminMessagesPage />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="*"
            element={<Navigate to={currentUser ? (currentUser.role === 'admin' ? '/admin' : '/teacher') : '/login'} replace />}
          />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
