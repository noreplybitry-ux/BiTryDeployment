import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import "../css/Signup.css";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import confetti from "canvas-confetti";
import { FiCalendar } from "react-icons/fi";

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    birthday: "",
    agreeToTerms: false,
    agreeToPrivacy: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayData, setBirthdayData] = useState("");
  const [userId, setUserId] = useState(null);

  // Modals for legal documents
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [hasOpenedTerms, setHasOpenedTerms] = useState(false);
  const [hasOpenedPrivacy, setHasOpenedPrivacy] = useState(false);

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

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = "First name must be at least 2 characters";
    } else if (!/^[a-zA-Z\s-']+$/.test(formData.firstName.trim())) {
      newErrors.firstName =
        "First name can only contain letters, spaces, hyphens, and apostrophes";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters";
    } else if (!/^[a-zA-Z\s-']+$/.test(formData.lastName.trim())) {
      newErrors.lastName =
        "Last name can only contain letters, spaces, hyphens, and apostrophes";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password =
        "Password must contain uppercase, lowercase, and number";
    }

    if (!formData.birthday) {
      newErrors.birthday = "Birthday is required";
    } else {
      const birthdayError = validateBirthday(formData.birthday);
      if (birthdayError) {
        newErrors.birthday = birthdayError;
      }
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must accept the Terms of Service";
    }
    if (!formData.agreeToPrivacy) {
      newErrors.agreeToPrivacy = "You must accept the Privacy Policy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    if (age <= 7) {
      Swal.fire({
        title: "Age Restriction",
        text: "You must be at least 8 years old to create an account.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return "You must be at least 8 years old to create an account.";
    }

    return null;
  };

  const createOrUpdateProfile = async (userId, userData, isNew) => {
    try {
      const profileData = {
        id: userId,
        first_name: userData.firstName,
        last_name: userData.lastName,
        birthday: userData.birthday,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileData);

      if (profileError) {
        throw profileError;
      }

      if (isNew) {
        const balanceData = {
          user_id: userId,
          balance: 10000,
          updated_at: new Date().toISOString(),
        };

        const { error: balanceError } = await supabase
          .from("user_balances")
          .insert(balanceData);

        if (balanceError) {
          throw balanceError;
        }
      }

      return true;
    } catch (error) {
      console.error("Error creating/updating profile or balance:", error);
      throw error;
    }
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
      // Get user's metadata from auth to get names
      const { data: authData } = await supabase.auth.getUser();
      const userMetadata = authData.user?.user_metadata || {};

      const firstName =
        userMetadata.full_name?.split(" ")[0] ||
        userMetadata.given_name ||
        userMetadata.first_name ||
        "";
      const lastName =
        userMetadata.full_name?.split(" ").slice(1).join(" ") ||
        userMetadata.family_name ||
        userMetadata.last_name ||
        "";

      const { data: existing, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (checkError) throw checkError;

      const isNew = !existing;

      await createOrUpdateProfile(
        userId,
        {
          firstName,
          lastName,
          birthday: birthdayData,
        },
        isNew
      );

      setShowBirthdayModal(false);

      Swal.fire({
        title: "Sign Up Bonus!",
        text: "You have been rewarded with a sign up bonus of 10,000 barya points.",
        icon: "success",
        confirmButtonText: "Great!",
        showClass: {
          popup: "animate__animated animate__bounceIn",
        },
        hideClass: {
          popup: "animate__animated animate__bounceOut",
        },
        customClass: {
          popup: "game-popup",
          title: "game-title",
          confirmButton: "game-button",
        },
        didOpen: () => {
          const duration = 15 * 1000;
          const animationEnd = Date.now() + duration;
          const defaults = {
            startVelocity: 30,
            spread: 360,
            ticks: 60,
            zIndex: 0,
          };

          function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
          }

          const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
              return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti(
              Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
              })
            );
            confetti(
              Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
              })
            );
          }, 250);
        },
      }).then(() => {
        navigate("/home");
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrors({ birthday: "Failed to update profile. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const checkUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("birthday")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return false; // No row found
        }
        throw error;
      }

      return data.birthday !== null;
    } catch (error) {
      console.error("Error checking user profile:", error);
      return false;
    }
  };

  const handlePostSignup = async (userId) => {
    setIsLoading(true);
    const hasCompleteProfile = await checkUserProfile(userId);
    setIsLoading(false);

    if (!hasCompleteProfile) {
      setUserId(userId);
      setShowBirthdayModal(true);
      return;
    }

    navigate("/home");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      console.log("Starting signup process...");

      // Sign up the user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            birthday: formData.birthday,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`, // Added: Explicit redirect for confirmation link
        },
      });

      console.log("Signup response:", { data, error });

      if (error) {
        console.error("Signup error:", error);

        // Handle specific Supabase errors
        if (
          error.message.includes("User already registered") ||
          error.message.includes("email address already in use") ||
          error.message.includes("already registered")
        ) {
          setErrors({ email: "An account with this email already exists" });
        } else if (
          error.message.includes("Password should be at least 6 characters")
        ) {
          setErrors({ password: "Password must be at least 6 characters" });
        } else if (
          error.message.includes("Invalid email") ||
          error.message.includes("Unable to validate email address")
        ) {
          setErrors({ email: "Please enter a valid email address" });
        } else if (
          error.message.includes("Database error") ||
          error.message.includes("saving new user") ||
          error.message.includes("insert or update on table") ||
          error.message.includes("violates foreign key constraint")
        ) {
          setErrors({
            general:
              "There was a problem creating your account. This might be due to a database configuration issue. Please contact support.",
          });
        } else {
          setErrors({ general: `Registration failed: ${error.message}` });
        }
        return;
      }

      console.log("User created:", data.user?.id);

      // Check if we have a user
      if (!data.user) {
        setErrors({ general: "Account creation failed. Please try again." });
        return;
      }

      // Create profile and balance records for the new user
      if (data.user) {
        try {
          const { data: existing } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", data.user.id)
            .maybeSingle();

          const isNew = !existing;

          await createOrUpdateProfile(
            data.user.id,
            {
              firstName: formData.firstName.trim(),
              lastName: formData.lastName.trim(),
              birthday: formData.birthday,
            },
            isNew
          );
        } catch (profileError) {
          console.error("Error creating profile:", profileError);
          // Don't fail the whole signup if profile creation fails
        }
      }

      // If we have a user but no session, they need to confirm their email
      if (data.user && !data.session) {
        console.log("Email confirmation required");
        setSuccessMessage(
          `Account created successfully! Please check your email (${formData.email}) and click the confirmation link to activate your account.`
        );

        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          birthday: "",
          agreeToTerms: false,
          agreeToPrivacy: false,
        });
      } else if (data.session) {
        console.log("User logged in automatically");
        Swal.fire({
          title: "Sign Up Bonus!",
          text: "You have been rewarded with a sign up bonus of 10,000 barya points.",
          icon: "success",
          confirmButtonText: "Great!",
          showClass: {
            popup: "animate__animated animate__bounceIn",
          },
          hideClass: {
            popup: "animate__animated animate__bounceOut",
          },
          customClass: {
            popup: "game-popup",
            title: "game-title",
            confirmButton: "game-button",
          },
          didOpen: () => {
            const duration = 15 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = {
              startVelocity: 30,
              spread: 360,
              ticks: 60,
              zIndex: 0,
            };

            function randomInRange(min, max) {
              return Math.random() * (max - min) + min;
            }

            const interval = setInterval(function () {
              const timeLeft = animationEnd - Date.now();

              if (timeLeft <= 0) {
                return clearInterval(interval);
              }

              const particleCount = 50 * (timeLeft / duration);
              confetti(
                Object.assign({}, defaults, {
                  particleCount,
                  origin: {
                    x: randomInRange(0.1, 0.3),
                    y: Math.random() - 0.2,
                  },
                })
              );
              confetti(
                Object.assign({}, defaults, {
                  particleCount,
                  origin: {
                    x: randomInRange(0.7, 0.9),
                    y: Math.random() - 0.2,
                  },
                })
              );
            }, 250);
          },
        }).then(() => {
          navigate("/home");
        });
      }
    } catch (error) {
      console.error("Unexpected signup error:", error);
      setErrors({ general: `An unexpected error occurred: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const generateNonce = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);

    const redirectTo = `${window.location.origin}/auth/callback`;

    const nonce = generateNonce();
    sessionStorage.setItem("google_auth_nonce", nonce);

    const params = new URLSearchParams({
      client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
      redirect_uri: redirectTo,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      nonce: nonce,
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handlePostSignup(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        handlePostSignup(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, text: "" };

    let strength = 0;
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ];

    strength = checks.filter(Boolean).length;

    if (strength <= 2) return { strength, text: "Weak", color: "#f84960" };
    if (strength === 3) return { strength, text: "Fair", color: "#ffa726" };
    if (strength === 4) return { strength, text: "Good", color: "#2196f3" };
    return { strength, text: "Strong", color: "#02c076" };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Register</h2>
          <p>Create your account and start trading crypto today</p>
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
          <div className="name-row">
            <div className="input-group">
              <label htmlFor="firstName">First Name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`auth-input ${errors.firstName ? "error" : ""}`}
                  placeholder="Enter first name"
                  disabled={isLoading}
                />
                <span className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
              {errors.firstName && (
                <span className="error-message">{errors.firstName}</span>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="lastName">Last Name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`auth-input ${errors.lastName ? "error" : ""}`}
                  placeholder="Enter last name"
                  disabled={isLoading}
                />
                <span className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
              {errors.lastName && (
                <span className="error-message">{errors.lastName}</span>
              )}
            </div>
          </div>

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
                placeholder="Create a strong password"
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
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${(passwordStrength.strength / 5) * 100}%`,
                      backgroundColor: passwordStrength.color,
                    }}
                  ></div>
                </div>
                <span
                  className="strength-text"
                  style={{ color: passwordStrength.color }}
                >
                  {passwordStrength.text}
                </span>
              </div>
            )}
            {errors.password && (
              <span className="error-message">{errors.password}</span>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="birthday">Date of Birth</label>
            <div className="input-wrapper">
              <input
                type="date"
                id="birthday"
                name="birthday"
                value={formData.birthday}
                onChange={handleInputChange}
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

          <div className="terms-agreement">
            <div className="checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleInputChange}
                  disabled={!hasOpenedTerms || isLoading}
                />
                <span className="checkmark"></span>I agree to the{" "}
                <span
                  className="terms-link"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setHasOpenedTerms(true);
                    setShowTermsModal(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setHasOpenedTerms(true);
                      setShowTermsModal(true);
                    }
                  }}
                >
                  Terms of Service
                </span>
              </label>
              {errors.agreeToTerms && (
                <span className="error-message">{errors.agreeToTerms}</span>
              )}
            </div>

            <div className="checkbox-row" style={{ marginTop: 8 }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agreeToPrivacy"
                  checked={formData.agreeToPrivacy}
                  onChange={handleInputChange}
                  disabled={!hasOpenedPrivacy || isLoading}
                />
                <span className="checkmark"></span>I agree to the{" "}
                <span
                  className="terms-link"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setHasOpenedPrivacy(true);
                    setShowPrivacyModal(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setHasOpenedPrivacy(true);
                      setShowPrivacyModal(true);
                    }
                  }}
                >
                  Privacy Policy
                </span>
              </label>
              {errors.agreeToPrivacy && (
                <span className="error-message">{errors.agreeToPrivacy}</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            className={`auth-btn primary ${isLoading ? "loading" : ""}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button
          className="auth-btn google"
          onClick={handleGoogleSignup}
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
          Sign up with Google
        </button>

        <div className="auth-footer">
          <p>
            Already have an account?{" "}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Birthday Modal */}
      {showBirthdayModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowBirthdayModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                        setErrors((prev) => ({ ...prev, birthday: "" }));
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

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div className="modal-overlay" onClick={() => setShowTermsModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "800px", width: "90%" }}
          >
            <div
              className="modal-header"
              style={{ position: "relative", paddingRight: "50px" }}
            >
              <h3>Terms of Service</h3>
              <button
                onClick={() => setShowTermsModal(false)}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "20px",
                  background: "none",
                  border: "none",
                  fontSize: "32px",
                  cursor: "pointer",
                }}
                aria-label="Close Terms"
              >
                ×
              </button>
            </div>
            <div
              className="modal-body"
              style={{
                maxHeight: "70vh",
                overflowY: "auto",
                padding: "20px",
                lineHeight: "1.6",
                fontSize: "14px",
              }}
            >
              <h2 style={{ fontSize: "24px", marginBottom: "10px" }}>
                Terms of Service
              </h2>
              <p>Last updated: December 14, 2025</p>
              <p>
                Please read these Terms of Service ("Terms", "Terms and
                Conditions") carefully before using the BiTry platform (the
                "Service") operated by BiTry ("us", "we", or "our").
              </p>
              <p>
                Your access to and use of the Service is conditioned upon your
                acceptance of and compliance with these Terms. These Terms apply
                to all visitors, users, and others who wish to access or use the
                Service.
              </p>
              <p>
                By accessing or using the Service you agree to be bound by these
                Terms. If you disagree with any part of the terms then you do
                not have permission to access the Service.
              </p>
              <h4 style={{ marginTop: "28px" }}>1. Acceptance of Terms</h4>
              <p>
                By creating an account or using BiTry (“the Platform”), you
                agree to these Terms of Service and our Privacy Policy. If you
                do not agree, do not use the Platform. BiTry is a web-based,
                gamified trading simulator that combines real market data,
                AI-powered Taglish lessons, and interactive tools for
                educational and entertainment purposes only. These Terms
                constitute a legally binding agreement made between you, whether
                personally or on behalf of an entity (“you”) and BiTry,
                concerning your access to and use of the BiTry website as well
                as any other media form, media channel, mobile website or mobile
                application related, linked, or otherwise connected thereto
                (collectively, the “Site”). You agree that by accessing the
                Site, you have read, understood, and agree to be bound by all of
                these Terms of Service. If you do not agree with all of these
                Terms of Service, then you are expressly prohibited from using
                the Site and you must discontinue use immediately.
              </p>
              <p>
                Supplemental terms and conditions or documents that may be
                posted on the Site from time to time are hereby expressly
                incorporated herein by reference. We reserve the right, in our
                sole discretion, to make changes or modifications to these Terms
                of Service at any time and for any reason. We will alert you
                about any changes by updating the “Last updated” date of these
                Terms of Service, and you waive any right to receive specific
                notice of each such change. It is your responsibility to
                periodically review these Terms of Service to stay informed of
                updates. You will be subject to, and will be deemed to have been
                made aware of and to have accepted, the changes in any revised
                Terms of Service by your continued use of the Site after the
                date such revised Terms of Service are posted.
              </p>
              <h4>2. Eligibility</h4>
              <p>
                You must be at least 18 years old to access the virtual trading
                simulator and legally capable of entering into contracts. Users
                under 18 may access educational modules only. You are
                responsible for complying with all laws in your jurisdiction,
                including those in the Republic of the Philippines. The
                information provided on the Site is not intended for
                distribution to or use by any person or entity in any
                jurisdiction or country where such distribution or use would be
                contrary to law or regulation or which would subject us to any
                registration requirement within such jurisdiction or country.
                Accordingly, those persons who choose to access the Site from
                other locations do so on their own initiative and are solely
                responsible for compliance with local laws, if and to the extent
                local laws are applicable.
              </p>
              <p>
                The Site is intended for users who are at least 18 years old.
                Persons under the age of 18 are not permitted to use or register
                for the Site unless limited to educational content as specified.
              </p>
              <h4>3. Nature of the Service</h4>
              <p>
                BiTry is a simulated cryptocurrency trading game for educational
                and entertainment purposes only. It provides spot and
                futures-style virtual trading with $barya (virtual currency). No
                real money or real cryptocurrency is ever at risk or traded. The
                Service is provided for informational and educational purposes
                only and should not be construed as financial advice. All
                trading simulations are based on historical and real-time market
                data but are not indicative of future performance. Users
                acknowledge that any decisions made based on the Service are
                their own responsibility.
              </p>
              <h4>4. $barya Points</h4>
              <p>
                $barya are virtual, non-transferable, and have no monetary
                value. They cannot be redeemed for cash or any real-world goods.
                Users receive a sign-up bonus of $10,000 and can earn more
                through quizzes and lessons. $barya points may be reset or
                adjusted at our discretion for any reason, including but not
                limited to system maintenance, fraud prevention, or policy
                changes.
              </p>
              <h4>5. Account Security</h4>
              <p>
                You are responsible for maintaining the confidentiality of your
                account credentials and for all activities that occur under your
                account. Age restrictions are enforced based on provided
                birthdate. You agree to notify us immediately of any
                unauthorized use of your account or any other breach of
                security. We will not be liable for any loss or damage arising
                from your failure to comply with this section.
              </p>
              <h4>6. Prohibited Conduct</h4>
              <p>
                You may not: (a) use bots, scripts, or any automated means; (b)
                attempt to gain unauthorized access; (c) harass or harm other
                users; (d) violate any applicable laws; (e) bypass age
                restrictions; (f) misuse AI-generated content. Additionally, you
                agree not to: reproduce, duplicate, copy, sell, resell or
                exploit any portion of the Service; upload or transmit viruses
                or any type of malicious code; interfere with or disrupt the
                integrity or performance of the Service; attempt to probe, scan
                or test the vulnerability of the system or network; or use the
                Service for any commercial solicitation purposes.
              </p>
              <h4>7. Intellectual Property</h4>
              <p>
                All content, trademarks, and data on the Platform, including
                AI-generated Taglish modules and quizzes, are owned by BiTry or
                its licensors and protected by copyright and other laws. Unless
                otherwise indicated, the Site is our proprietary property and
                all source code, databases, functionality, software, website
                designs, audio, video, text, photographs, and graphics on the
                Site (collectively, the “Content”) and the trademarks, service
                marks, and logos contained therein (the “Marks”) are owned or
                controlled by us or licensed to us, and are protected by
                copyright and trademark laws and various other intellectual
                property rights and unfair competition laws of the United
                States, foreign jurisdictions, and international conventions.
                The Content and the Marks are provided on the Site “AS IS” for
                your information and personal use only. Except as expressly
                provided in these Terms of Service, no part of the Site and no
                Content or Marks may be copied, reproduced, aggregated,
                republished, uploaded, posted, publicly displayed, encoded,
                translated, transmitted, distributed, sold, licensed, or
                otherwise exploited for any commercial purpose whatsoever,
                without our express prior written permission.
              </p>
              <h4>8. Disclaimer of Warranties</h4>
              <p>
                THE PLATFORM IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT
                WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. Market data is for
                simulation only and may have delays. We make no warranty that
                the Site will meet your requirements, will be available on an
                uninterrupted, timely, secure, or error-free basis, or will be
                accurate, reliable, free of viruses or other harmful code,
                complete, legal, or safe. If applicable law requires any
                warranties with respect to the Site, all such warranties are
                limited in duration to ninety (90) days from the date of first
                use.
              </p>
              <h4>9. Limitation of Liability</h4>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, BITRY WILL NOT BE LIABLE
                FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                PUNITIVE DAMAGES ARISING FROM USE OF THE PLATFORM OR SIMULATED
                TRADING. In no event shall our aggregate liability arising out
                of or related to this agreement, whether arising out of or
                related to breach of contract, tort (including negligence) or
                otherwise, exceed the total of the amounts paid to us by you for
                the Service in the twelve (12) months preceding the event giving
                rise to the claim.
              </p>
              <h4>10. Termination</h4>
              <p>
                We may suspend or terminate your account at any time, with or
                without notice, for any reason, including violation of age
                restrictions or prohibited conduct. Upon termination, your right
                to use the Service will immediately cease. If you wish to
                terminate your account, you may simply discontinue using the
                Service.
              </p>
              <h4>11. Governing Law</h4>
              <p>
                These Terms are governed by the laws of the Republic of the
                Philippines, without regard to its conflict of law provisions.
                Any disputes arising from these Terms shall be resolved in the
                courts located in the Republic of the Philippines.
              </p>
              <h4>12. Contact</h4>
              <p>
                If you have any questions about these Terms, please contact us
                at noreplybitry@gmail.com.
              </p>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowTermsModal(false)}
                className="auth-btn primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPrivacyModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "800px", width: "90%" }}
          >
            <div
              className="modal-header"
              style={{ position: "relative", paddingRight: "50px" }}
            >
              <h3>Privacy Policy</h3>
              <button
                onClick={() => setShowPrivacyModal(false)}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "20px",
                  background: "none",
                  border: "none",
                  fontSize: "32px",
                  cursor: "pointer",
                }}
                aria-label="Close Privacy"
              >
                ×
              </button>
            </div>
            <div
              className="modal-body"
              style={{
                maxHeight: "70vh",
                overflowY: "auto",
                padding: "20px",
                lineHeight: "1.6",
                fontSize: "14px",
              }}
            >
              <h2 style={{ fontSize: "24px", marginBottom: "10px" }}>
                Privacy Policy
              </h2>
              <p>Last updated: December 14, 2025</p>
              <p>
                BiTry ("us", "we", or "our") operates the BiTry platform
                (hereinafter referred to as the "Service").
              </p>
              <p>
                This page informs you of our policies regarding the collection,
                use, and disclosure of personal data when you use our Service
                and the choices you have associated with that data.
              </p>
              <p>
                We use your data to provide and improve the Service. By using
                the Service, you agree to the collection and use of information
                in accordance with this policy. Unless otherwise defined in this
                Privacy Policy, the terms used in this Privacy Policy have the
                same meanings as in our Terms and Conditions.
              </p>
              <h4 style={{ marginTop: "28px" }}>1. Information We Collect</h4>
              <p>
                We collect several different types of information for various
                purposes to provide and improve our Service to you.
              </p>
              <p>
                <strong>Personal Data</strong>: While using our Service, we may
                ask you to provide us with certain personally identifiable
                information that can be used to contact or identify you
                ("Personal Data"). Personally identifiable information may
                include, but is not limited to:
              </p>
              <ul>
                <li>Email address</li>
                <li>First name and last name</li>
                <li>Date of birth</li>
                <li>Cookies and Usage Data</li>
              </ul>
              <p>
                When you sign up with Google: name and email from your Google
                account.
              </p>
              <p>
                <strong>Usage Data</strong>: We may also collect information on
                how the Service is accessed and used ("Usage Data"). This Usage
                Data may include information such as your computer's Internet
                Protocol address (e.g. IP address), browser type, browser
                version, the pages of our Service that you visit, the time and
                date of your visit, the time spent on those pages, unique device
                identifiers and other diagnostic data. This includes trading
                simulations, quiz attempts, lesson progress, and interactions
                with AI-generated content.
              </p>
              <p>
                <strong>Tracking & Cookies Data</strong>: We use cookies and
                similar tracking technologies to track the activity on our
                Service and hold certain information. Cookies are files with
                small amount of data which may include an anonymous unique
                identifier. Cookies are sent to your browser from a website and
                stored on your device. Tracking technologies also used are
                beacons, tags, and scripts to collect and track information and
                to improve and analyze our Service. You can instruct your
                browser to refuse all cookies or to indicate when a cookie is
                being sent. However, if you do not accept cookies, you may not
                be able to use some portions of our Service.
              </p>
              <h4>2. How We Use Your Information</h4>
              <p>BiTry uses the collected data for various purposes:</p>
              <ul>
                <li>To provide and maintain our Service</li>
                <li>To notify you about changes to our Service</li>
                <li>
                  To allow you to participate in interactive features of our
                  Service when you choose to do so
                </li>
                <li>To provide customer support</li>
                <li>
                  To gather analysis or valuable information so that we can
                  improve our Service (including AI personalization)
                </li>
                <li>To monitor the usage of our Service</li>
                <li>To detect, prevent and address technical issues</li>
                <li>To communicate with you</li>
                <li>To enforce age restrictions</li>
                <li>To prevent fraud</li>
                <li>To comply with legal obligations</li>
              </ul>
              <h4>3. Sharing of Information</h4>
              <p>
                We do not sell your personal data. We may share it with trusted
                service providers (e.g., Supabase for authentication, Binance
                API for market data, NewsAPI for news, AI services for content
                generation) or when required by law. We may also disclose your
                Personal Data in the good faith belief that such action is
                necessary to:
              </p>
              <ul>
                <li>Comply with a legal obligation</li>
                <li>Protect and defend the rights or property of BiTry</li>
                <li>
                  Prevent or investigate possible wrongdoing in connection with
                  the Service
                </li>
                <li>
                  Protect the personal safety of users of the Service or the
                  public
                </li>
                <li>Protect against legal liability</li>
              </ul>
              <h4>4. Data Security</h4>
              <p>
                The security of your data is important to us but remember that
                no method of transmission over the Internet or method of
                electronic storage is 100% secure. While we strive to use
                commercially acceptable means to protect your Personal Data, we
                cannot guarantee its absolute security. We use industry-standard
                measures to protect your data, but no method is 100% secure.
                Data is stored in compliance with tier limitations of services
                like Supabase.
              </p>
              <h4>5. Your Rights</h4>
              <p>
                BiTry aims to take reasonable steps to allow you to correct,
                amend, delete or limit the use of your Personal Data. You may
                access, correct, or request deletion of your data by contacting
                us at noreplybitry@gmail.com. If you wish to be informed about
                what Personal Data we hold about you and if you want it to be
                removed from our systems, please contact us. In certain
                circumstances, you have the following data protection rights:
              </p>
              <ul>
                <li>
                  The right to access, update or delete the information we have
                  on you.
                </li>
                <li>The right of rectification.</li>
                <li>The right to object.</li>
                <li>The right of restriction.</li>
                <li>The right to data portability</li>
                <li>The right to withdraw consent</li>
              </ul>
              <h4>6. Children’s Privacy</h4>
              <p>
                Our Service does not address anyone under the age of 18
                ("Children"). We do not knowingly collect personally
                identifiable information from anyone under the age of 18 without
                proper restrictions. If you are a parent or guardian and you are
                aware that your Child has provided us with Personal Data, please
                contact us. If we become aware that we have collected Personal
                Data from children without verification of parental consent, we
                take steps to remove that information from our servers. The
                Platform enforces age restrictions: full features are not
                intended for persons under 18. Users under 18 are limited to
                educational content.
              </p>
              <h4>7. Changes</h4>
              <p>
                We may update our Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page. We will let you know via email and/or a prominent
                notice on our Service, prior to the change becoming effective
                and update the "effective date" at the top of this Privacy
                Policy. You are advised to review this Privacy Policy
                periodically for any changes. Changes to this Privacy Policy are
                effective when they are posted on this page. Material changes
                will be notified via email or in-app notice.
              </p>
              <h4>8. Contact</h4>
              <p>
                If you have any questions about this Privacy Policy, please
                contact us at noreplybitry@gmail.com.
              </p>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="auth-btn primary"
              >
                Close
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
          <div className="shape shape-4"></div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
