import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";

/* Pages */
import Homepage from "./components/Homepage";
import Dashboard from "./components/Dashboard";
import Learn2 from "./components/Learn2";
import Trade from "./components/Trade";
import News from "./components/News";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Leaderboard from "./components/Leaderboard";
import ForgotPassword from "./components/ForgotPassword";
import AdminDashboard from "./components/AdminDashboard";
import ModuleDetail from "./components/ModuleDetail";
import QuizPage from "./components/QuizPage";
import AuthCallback from "./components/AuthCallback";

function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <Navbar />
        <main className="main-area">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/learn" element={<Learn2 />} />
            <Route path="/module/:id" element={<ModuleDetail />} />
            <Route path="/quiz/:moduleId" element={<QuizPage />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/news" element={<News />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgotpassword" element={<ForgotPassword />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/admindashboard" element={<AdminDashboard />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<Homepage />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
