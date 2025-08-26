import React, { useState, useEffect, useRef } from 'react';
import '../css/ForgotPassword.css';
import { useNavigate, Link } from "react-router-dom";

const ForgotPassword = () => {
  const [currentStep, setCurrentStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [formData, setFormData] = useState({
    email: '',
    otp: ['', '', '', '', '', ''],
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef([]);

  // Timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(timer - 1);
      }, 1000);
    } else if (timer === 0 && currentStep === 2) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer, currentStep]);

  // Auto-focus first OTP input when step changes to 2
  useEffect(() => {
    if (currentStep === 2 && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [currentStep]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleOtpChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...formData.otp];
    newOtp[index] = value;
    
    setFormData(prev => ({
      ...prev,
      otp: newOtp
    }));

    // Clear OTP error
    if (errors.otp) {
      setErrors(prev => ({
        ...prev,
        otp: ''
      }));
    }

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !formData.otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '');
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setFormData(prev => ({
        ...prev,
        otp: newOtp
      }));
      otpRefs.current[5]?.focus();
    }
  };

  const validateEmail = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateOtp = () => {
    const newErrors = {};
    const otpString = formData.otp.join('');

    if (otpString.length !== 6) {
      newErrors.otp = 'Please enter the complete 6-digit code';
    } else if (!/^\d{6}$/.test(otpString)) {
      newErrors.otp = 'OTP must contain only numbers';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else if (!/(?=.*[a-z])/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one lowercase letter';
      } else if (!/(?=.*[A-Z])/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one uppercase letter';
      } else if (!/(?=.*\d)/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one number';
      } else if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one special character';
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateEmail()) return;

    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Password reset email sent to:', formData.email);
      setCurrentStep(2);
      setTimer(300); // 5 minutes
      setCanResend(false);
    } catch (error) {
      console.error('Failed to send reset email:', error);
      setErrors({ email: 'Failed to send reset email. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateOtp()) return;

    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      const otpString = formData.otp.join('');
      console.log('OTP verified:', otpString);
      setCurrentStep(3);
    } catch (error) {
      console.error('OTP verification failed:', error);
      setErrors({ otp: 'Invalid OTP. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) return;

    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Password reset successful');
      // Handle successful password reset (redirect to login)
      alert('Password reset successful! Please login with your new password.');
    } catch (error) {
      console.error('Password reset failed:', error);
      setErrors({ password: 'Failed to reset password. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('OTP resent to:', formData.email);
      setTimer(300);
      setCanResend(false);
      setFormData(prev => ({
        ...prev,
        otp: ['', '', '', '', '', '']
      }));
      otpRefs.current[0]?.focus();
    } catch (error) {
      console.error('Failed to resend OTP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    // Navigate back to login
    console.log('Navigate to login');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, label: '' };
    
    let score = 0;
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      password.length >= 12
    ];
    
    score = checks.filter(Boolean).length;
    
    if (score <= 2) return { strength: 1, label: 'Weak', color: 'var(--accent-red)' };
    if (score <= 4) return { strength: 2, label: 'Medium', color: 'var(--accent-orange)' };
    return { strength: 3, label: 'Strong', color: 'var(--accent-green)' };
  };

  const renderEmailStep = () => (
    <div className="auth-card">
      <div className="auth-header">
        <h2>Forgot Password?</h2>
        <p>Enter your email address and we'll send you a verification code</p>
      </div>

      <form className="auth-form" onSubmit={handleEmailSubmit}>
        <div className="input-group">
          <label htmlFor="email">Email Address</label>
          <div className="input-wrapper">
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`auth-input ${errors.email ? 'error' : ''}`}
              placeholder="Enter your email address"
              disabled={isLoading}
              autoComplete="email"
            />
            <span className="input-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 8L10.89 13.26C11.2 13.47 11.8 13.47 12.11 13.26L20 8M5 19H19C20.1 19 21 18.1 21 17V7C21 5.9 20.1 5 19 5H5C3.9 5 3 5.9 3 7V17C3 18.1 3.9 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <button 
          type="submit"
          className={`auth-btn primary ${isLoading ? 'loading' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="loading-spinner"></div>
              Sending Code...
            </>
          ) : (
            'Send Verification Code'
          )}
        </button>
      </form>

      <div className="auth-footer">
        <p>Remember your password?{" "} <Link to="/login" className="auth-link">Back to Login</Link></p>
      </div>
    </div>
  );

  const renderOtpStep = () => (
    <div className="auth-card">
      <div className="auth-header">
        <h2>Enter Verification Code</h2>
        <p>We've sent a 6-digit code to <strong>{formData.email}</strong></p>
      </div>

      <form className="auth-form" onSubmit={handleOtpSubmit}>
        <div className="input-group">
          <label>Verification Code</label>
          <div className="otp-container">
            {formData.otp.map((digit, index) => (
              <input
                key={index}
                ref={el => otpRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                onPaste={index === 0 ? handleOtpPaste : undefined}
                className={`otp-input ${errors.otp ? 'error' : ''}`}
                disabled={isLoading}
              />
            ))}
          </div>
          {errors.otp && <span className="error-message">{errors.otp}</span>}
        </div>

        <div className="otp-timer">
          {timer > 0 ? (
            <p>Resend code in <strong>{formatTime(timer)}</strong></p>
          ) : (
            <p>
              Didn't receive the code? {' '}
              <button 
                type="button" 
                className="auth-link" 
                onClick={handleResendOtp}
                disabled={isLoading}
              >
                Resend Code
              </button>
            </p>
          )}
        </div>

        <button 
          type="submit"
          className={`auth-btn primary ${isLoading ? 'loading' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="loading-spinner"></div>
              Verifying...
            </>
          ) : (
            'Verify Code'
          )}
        </button>
      </form>

      <div className="auth-footer">
        <p>Wrong email? <button type="button" className="auth-link" onClick={() => setCurrentStep(1)}>Change Email</button></p>
      </div>
    </div>
  );

  const renderPasswordStep = () => {
    const passwordStrength = getPasswordStrength();
    
    return (
      <div className="auth-card">
        <div className="auth-header">
          <h2>Reset Your Password</h2>
          <p>Create a new secure password for your account</p>
        </div>

        <form className="auth-form" onSubmit={handlePasswordSubmit}>
          <div className="input-group">
            <label htmlFor="password">New Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`auth-input ${errors.password ? 'error' : ''}`}
                placeholder="Enter new password"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M17.94 17.94C16.2 19.57 13.71 20.5 12 20.5C4.48 20.5 1.5 12 1.5 12C2.29 10.56 3.4 9.19 4.69 8.06M9.9 4.24C10.58 4.08 11.29 4 12 4C19.52 4 22.5 12 22.5 12C21.57 13.94 20.17 15.59 18.51 16.84M12 7C14.21 7 16 8.79 16 11C16 11.35 15.94 11.69 15.83 12M12 15C9.79 15 8 13.21 8 11C8 10.65 8.06 10.31 8.17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M1.5 12C1.5 12 4.5 4 12 4C19.5 4 22.5 12 22.5 12C22.5 12 19.5 20 12 20C4.5 20 1.5 12 1.5 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
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
                      width: `${(passwordStrength.strength / 3) * 100}%`,
                      backgroundColor: passwordStrength.color
                    }}
                  ></div>
                </div>
                <span className="strength-label" style={{color: passwordStrength.color}}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`auth-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your new password"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M17.94 17.94C16.2 19.57 13.71 20.5 12 20.5C4.48 20.5 1.5 12 1.5 12C2.29 10.56 3.4 9.19 4.69 8.06M9.9 4.24C10.58 4.08 11.29 4 12 4C19.52 4 22.5 12 22.5 12C21.57 13.94 20.17 15.59 18.51 16.84M12 7C14.21 7 16 8.79 16 11C16 11.35 15.94 11.69 15.83 12M12 15C9.79 15 8 13.21 8 11C8 10.65 8.06 10.31 8.17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M1.5 12C1.5 12 4.5 4 12 4C19.5 4 22.5 12 22.5 12C22.5 12 19.5 20 12 20C4.5 20 1.5 12 1.5 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>

          <div className="password-requirements">
            <p>Password must contain:</p>
            <ul>
              <li className={formData.password.length >= 8 ? 'valid' : ''}>At least 8 characters</li>
              <li className={/[a-z]/.test(formData.password) ? 'valid' : ''}>One lowercase letter</li>
              <li className={/[A-Z]/.test(formData.password) ? 'valid' : ''}>One uppercase letter</li>
              <li className={/\d/.test(formData.password) ? 'valid' : ''}>One number</li>
              <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'valid' : ''}>One special character</li>
            </ul>
          </div>

          <button 
            type="submit"
            className={`auth-btn primary ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="auth-container">
      {currentStep === 1 && renderEmailStep()}
      {currentStep === 2 && renderOtpStep()}
      {currentStep === 3 && renderPasswordStep()}

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

export default ForgotPassword;