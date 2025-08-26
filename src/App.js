import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";

/* Pages */
import Homepage from "./components/Homepage";
import Dashboard from "./components/Dashboard";
import Learn from "./components/Learn";
import Trade from "./components/Trade";
import News from "./components/News";
import Login from "./components/Login";
import Signup from "./components/Signup";
import ForgotPassword from "./components/ForgotPassword";

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-area">
        <Routes>
          <Route path="/home" element={<Homepage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/trade" element={<Trade />} />
          <Route path="/news" element={<News />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgotpassword" element={<ForgotPassword />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
