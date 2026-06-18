import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingState } from "@/components/primitives";

// Route-level code splitting — the landing page no longer pulls in Recharts
// (HOD) or the heavier dashboard code until those routes are visited.
const Landing = lazy(() => import("@/pages/auth/Landing"));
const StudentDashboard = lazy(() => import("@/pages/student/StudentDashboard"));
const MentorDashboard = lazy(() => import("@/pages/mentor/MentorDashboard"));
const HODDashboard = lazy(() => import("@/pages/admin/HODDashboard"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));

function FullScreenFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-snow">
      <LoadingState label="Loading MentorOS…" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<FullScreenFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="/app/mentor" replace />} />
          <Route path="student" element={<StudentDashboard />} />
          <Route path="mentor" element={<MentorDashboard />} />
          <Route path="hod" element={<HODDashboard />} />
          <Route path="admin" element={<AdminDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
