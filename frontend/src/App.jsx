import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import FeedPage from "./pages/FeedPage";
import ProfilePage from "./pages/ProfilePage";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={token ? "/feed" : "/login"} replace />} />
      <Route path="/login" element={token ? <Navigate to="/feed" replace /> : <LoginPage />} />
      <Route path="/register" element={token ? <Navigate to="/feed" replace /> : <RegistrationPage />} />
      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            <FeedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={token ? "/feed" : "/login"} replace />} />
    </Routes>
  );
}

export default App;

