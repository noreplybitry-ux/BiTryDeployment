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

  const handleGoogleSignup = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/signup`,
        },
      });

      if (error) {
        console.error("Google signup error:", error);
        setErrors({ general: "Google signup failed. Please try again." });
      }
      // The redirect will happen automatically if successful
    } catch (error) {
      console.error("Google signup error:", error);
      setErrors({ general: "Google signup failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
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
              <p>
                <strong>Last Updated: November 14, 2025</strong>
              </p>
              <h4 style={{ marginTop: "28px" }}>1. Acceptance of Terms</h4>
              <p>
                By creating an account or using Barya (“the Platform”), you
                agree to these Terms of Service and our Privacy Policy. If you
                do not agree, do not use the Platform.
              </p>
              <h4>2. Eligibility</h4>
              <p>
                You must be at least 18 years old and legally capable of
                entering into contracts. You are responsible for complying with
                all laws in your jurisdiction.
              </p>
              <h4>3. Nature of the Service</h4>
              <p>
                Barya is a simulated cryptocurrency trading game for educational
                and entertainment purposes only. No real money or real
                cryptocurrency is ever at risk or traded.
              </p>
              <h4>4. Barya Points</h4>
              <p>
                Barya Points are virtual, non-transferable, and have no monetary
                value. They cannot be redeemed for cash or any real-world goods.
              </p>
              <h4>5. Account Security</h4>
              <p>
                You are responsible for maintaining the confidentiality of your
                account credentials and for all activities that occur under your
                account.
              </p>
              <h4>6. Prohibited Conduct</h4>
              <p>
                You may not: (a) use bots, scripts, or any automated means; (b)
                attempt to gain unauthorized access; (c) harass or harm other
                users; (d) violate any applicable laws.
              </p>
              <h4>7. Intellectual Property</h4>
              <p>
                All content, trademarks, and data on the Platform are owned by
                Barya or its licensors and protected by copyright and other
                laws.
              </p>
              <h4>8. Disclaimer of Warranties</h4>
              <p>
                THE PLATFORM IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT
                WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
              </p>
              <h4>9. Limitation of Liability</h4>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, BARYA WILL NOT BE LIABLE
                FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                PUNITIVE DAMAGES.
              </p>
              <h4>10. Termination</h4>
              <p>
                We may suspend or terminate your account at any time, with or
                without notice, for any reason.
              </p>
              <h4>11. Governing Law</h4>
              <p>
                These Terms are governed by the laws of the Republic of the
                Philippines.
              </p>
              <h4>12. Contact</h4>
              <p>support@barya.app</p>
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
              <p>
                <strong>Last Updated: November 14, 2025</strong>
              </p>
              <h4 style={{ marginTop: "28px" }}>1. Information We Collect</h4>
              <p>We collect:</p>
              <ul>
                <li>
                  Information you provide: name, email, date of birth, password
                </li>
                <li>Usage data: trades, scores, device info, IP address</li>
                <li>
                  When you sign up with Google: name and email from your Google
                  account
                </li>
              </ul>
              <h4>2. How We Use Your Information</h4>
              <p>
                To operate the service, improve the Platform, communicate with
                you, prevent fraud, and comply with legal obligations.
              </p>
              <h4>3. Sharing of Information</h4>
              <p>
                We do not sell your personal data. We may share it with trusted
                service providers (e.g., Supabase for authentication, analytics
                providers) or when required by law.
              </p>
              <h4>4. Data Security</h4>
              <p>
                We use industry-standard measures to protect your data, but no
                method is 100% secure.
              </p>
              <h4>5. Your Rights</h4>
              <p>
                You may access, correct, or request deletion of your data by
                contacting us at privacy@barya.app.
              </p>
              <h4>6. Children’s Privacy</h4>
              <p>
                The Platform is not intended for persons under 18. We do not
                knowingly collect data from minors.
              </p>
              <h4>7. Changes</h4>
              <p>
                We may update this policy. Material changes will be notified via
                email or in-app notice.
              </p>
              <h4>8. Contact</h4>
              <p>privacy@barya.app</p>
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
