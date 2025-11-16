import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../css/Signup.css';
import { FiCalendar } from 'react-icons/fi';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayData, setBirthdayData] = useState('');
  const [errors, setErrors] = useState({});
  const [userId, setUserId] = useState(null);
  const [userMetadata, setUserMetadata] = useState({});

  const validateBirthday = (birthday) => {
    if (!birthday) {
      return 'Birthday is required';
    }

    const birthDate = new Date(birthday);
    const today = new Date();

    if (birthDate > today) {
      return 'Birthday cannot be in the future';
    }

    return null;
  };

  const checkUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('birthday')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking user profile:', error);
        return false;
      }

      // Return true if profile exists and birthday is set
      return data && data.birthday !== null;
    } catch (error) {
      console.error('Error checking user profile:', error);
      return false;
    }
  };

  const createOrUpdateProfile = async (userId, userData) => {
    try {
      // Extract names from Google metadata, using multiple possible fields for robustness
      const fullName = userData.full_name || userData.name || '';
      const nameParts = fullName.split(' ');
      const firstName = userData.given_name || userData.first_name || nameParts[0] || '';
      const lastName = userData.family_name || userData.last_name || nameParts.slice(1).join(' ') || '';

      const profile = {
        id: userId,
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString()
      };

      // Only set birthday if explicitly provided (truthy value)
      if (birthdayData) {
        profile.birthday = birthdayData;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(profile);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error creating/updating profile:', error);
      throw error;
    }
  };

  const handleBirthdaySubmit = async () => {
    const birthdayError = validateBirthday(birthdayData);
    if (birthdayError) {
      setErrors({ birthday: birthdayError });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await createOrUpdateProfile(userId, userMetadata);
      setShowBirthdayModal(false);
      
      // Redirect to home page
      navigate('/home', { replace: true });
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors({ birthday: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          navigate('/login', { replace: true });
          return;
        }

        const session = data.session;
        if (!session || !session.user) {
          console.log('No session found, redirecting to login');
          navigate('/login', { replace: true });
          return;
        }

        const user = session.user;
        console.log('User authenticated:', user.id);
        
        setUserMetadata(user.user_metadata || {});
        
        // Always update first_name and last_name from metadata (won't touch birthday since birthdayData is falsy)
        await createOrUpdateProfile(user.id, user.user_metadata || {});
        
        // Check if user has a complete profile (specifically birthday)
        const hasCompleteProfile = await checkUserProfile(user.id);
        
        if (hasCompleteProfile) {
          // Profile is complete, redirect to home
          navigate('/home', { replace: true });
        } else {
          // Need to collect birthday
          setUserId(user.id);
          setShowBirthdayModal(true);
          setLoading(false);
        }

      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        navigate('/login', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (loading && !showBirthdayModal) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Completing Sign In</h2>
            <p>Please wait while we set up your account...</p>
          </div>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
          </div>
        </div>
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
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome!</h2>
          <p>Your Google account has been connected successfully</p>
        </div>
      </div>

      {/* Birthday Modal */}
      {showBirthdayModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Complete Your Profile</h3>
              <p>Please provide your date of birth to finish setting up your account</p>
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
                        setErrors(prev => ({
                          ...prev,
                          birthday: ''
                        }));
                      }
                    }}
                    className={`auth-input ${errors.birthday ? 'error' : ''}`}
                    disabled={loading}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <span className="input-icon">
                    <FiCalendar size={20} />
                  </span>
                </div>
                {errors.birthday && <span className="error-message">{errors.birthday}</span>}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button"
                className={`auth-btn primary ${loading ? 'loading' : ''}`}
                onClick={handleBirthdaySubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Updating...
                  </>
                ) : (
                  'Continue'
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

export default AuthCallback;