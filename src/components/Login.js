import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import "../css/Login.css";
import { useNavigate, Link } from "react-router-dom";
import { FiCalendar } from 'react-icons/fi';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayData, setBirthdayData] = useState("");
  const [userId, setUserId] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    // Clear success message when user modifies form
    if (successMessage) {
      setSuccessMessage("");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("birthday, is_admin")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error checking user profile:", error);
        return { hasCompleteProfile: false, isAdmin: false };
      }

      // Return profile status and admin status
      return {
        hasCompleteProfile: data && data.birthday !== null,
        isAdmin: data && data.is_admin === true,
      };
    } catch (error) {
      console.error("Error checking user profile:", error);
      return { hasCompleteProfile: false, isAdmin: false };
    }
  };

  const createOrUpdateProfile = async (userId, birthdayDate) => {
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        birthday: birthdayData,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error creating/updating profile:", error);
      throw error;
    }
  };

  const validateBirthday = (birthday) => {
    if (!birthday) {
      return "Birthday is required";
    }

    const birthDate = new Date(birthday);
    const today = new Date();

    if (birthDate > today) {
      return "Birthday cannot be in the future";
    }

    return null;
  };

  const handleBirthdaySubmit = async () => {
    const birthdayError = validateBirthday(birthdayData);
    if (birthdayError) {
      setErrors({ birthday: birthdayError });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await createOrUpdateProfile(userId, birthdayData);
      setShowBirthdayModal(false);
      setSuccessMessage("Profile completed! Redirecting to homepage...");

      setTimeout(() => {
        navigate("/home");
      }, 1500);
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrors({ birthday: "Failed to update profile. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      // Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (error) {
        // Handle specific Supabase errors
        if (error.message.includes("Invalid login credentials")) {
          setErrors({
            general:
              "Invalid email or password. Please check your credentials and try again.",
          });
        } else if (error.message.includes("Email not confirmed")) {
          setErrors({
            general:
              "Please check your email and click the confirmation link before signing in.",
          });
        } else if (error.message.includes("Too many requests")) {
          setErrors({
            general:
              "Too many login attempts. Please wait a few minutes and try again.",
          });
        } else if (error.message.includes("Invalid email")) {
          setErrors({ email: "Please enter a valid email address" });
        } else {
          setErrors({ general: error.message });
        }
        return;
      }

      // Successful login
      if (data.session && data.user) {
        // Check if user has a complete profile and admin status
        const { hasCompleteProfile, isAdmin } = await checkUserProfile(
          data.user.id
        );

        if (isAdmin) {
          // Admin user, redirect to admin dashboard
          setSuccessMessage(
            "Login successful! Redirecting to admin dashboard..."
          );
          setTimeout(() => {
            navigate("/admindashboard");
          }, 1500);
          return;
        }

        if (!hasCompleteProfile) {
          // Non-admin user needs to complete profile
          setUserId(data.user.id);
          setShowBirthdayModal(true);
          setIsLoading(false);
          return;
        }

        // Non-admin user with complete profile
        setSuccessMessage("Login successful! Redirecting to homepage...");
        setTimeout(() => {
          navigate("/home");
        }, 1500);
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const generateNonce = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  };

  const hashNonce = async (nonce) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(nonce);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);

    const redirectTo = `${window.location.origin}/auth/callback`;

    const nonce = generateNonce();
    const hashedNonce = await hashNonce(nonce);
    sessionStorage.setItem('google_auth_nonce', hashedNonce);

    const params = new URLSearchParams({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
      redirect_uri: redirectTo,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      nonce: nonce,
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Sign in to your account to continue trading</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div
            className="success-message"
            style={{
              padding: "12px",
              backgroundColor: "#d4edda",
              color: "#155724",
              border: "1px solid #c3e6cb",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "14px",
            }}
          >
            {successMessage}
          </div>
        )}

        {/* General Error Message */}
        {errors.general && (
          <div
            className="error-message"
            style={{
              padding: "12px",
              backgroundColor: "#f8d7da",
              color: "#721c24",
              border: "1px solid #f5c6cb",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "14px",
            }}
          >
            {errors.general}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`auth-input ${errors.email ? "error" : ""}`}
                placeholder="Enter your email"
                disabled={isLoading}
              />
              <span className="input-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 8L10.89 13.26C11.2 13.47 11.8 13.47 12.11 13.26L20 8M5 19H19C20.1 19 21 18.1 21 17V7C21 5.9 20.1 5 19 5H5C3.9 5 3 5.9 3 7V17C3 18.1 3.9 19 5 19Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
            {errors.email && (
              <span className="error-message">{errors.email}</span>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`auth-input ${errors.password ? "error" : ""}`}
                placeholder="Enter your password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M17.94 17.94C16.2 19.57 13.71 20.5 12 20.5C4.48 20.5 1.5 12 1.5 12C2.29 10.56 3.4 9.19 4.69 8.06M9.9 4.24C10.58 4.08 11.29 4 12 4C19.52 4 22.5 12 22.5 12C21.57 13.94 20.17 15.59 18.51 16.84M12 7C14.21 7 16 8.79 16 11C16 11.35 15.94 11.69 15.83 12M12 15C9.79 15 8 13.21 8 11C8 10.65 8.06 10.31 8.17 10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3 3L21 21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M1.5 12C1.5 12 4.5 4 12 4C19.5 4 22.5 12 22.5 12C22.5 12 19.5 20 12 20C4.5 20 1.5 12 1.5 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <span className="error-message">{errors.password}</span>
            )}
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              <span className="checkmark"></span>
              Remember me
            </label>
            <Link to="/forgotpassword" className="forgot-link">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className={`auth-btn primary ${isLoading ? "loading" : ""}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button
          className="auth-btn google"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <div className="auth-footer">
          <p>
            Don't have an account?{" "}
            <Link to="/signup" className="auth-link">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Birthday Modal */}
      {showBirthdayModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Complete Your Profile</h3>
              <p>
                Please provide your date of birth to finish setting up your
                account
              </p>
            </div>

            <div className="modal-body">
              <div className="input-group">
                <label htmlFor="modalBirthday">Date of Birth</label>
                <div className="input-wrapper">
                  <input
                    type="date"
                    id="modalBirthday"
                    value={birthdayData}
                    onChange={(e) => {
                      setBirthdayData(e.target.value);
                      if (errors.birthday) {
                        setErrors((prev) => ({
                          ...prev,
                          birthday: "",
                        }));
                      }
                    }}
                    className={`auth-input ${errors.birthday ? "error" : ""}`}
                    disabled={isLoading}
                    max={new Date().toISOString().split("T")[0]}
                  />
                  <span className="input-icon">
                    <FiCalendar size={20} />
                  </span>
                </div>
                {errors.birthday && (
                  <span className="error-message">{errors.birthday}</span>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className={`auth-btn primary ${isLoading ? "loading" : ""}`}
                onClick={handleBirthdaySubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Updating...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="auth-background">
        <div className="bg-pattern"></div>
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>
    </div>
  );
};

export default Login;