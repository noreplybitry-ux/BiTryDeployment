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
    if (!birthday) return 'Birthday is required';
    const birthDate = new Date(birthday);
    const today = new Date();
    if (birthDate > today) return 'Birthday cannot be in the future';
    return null;
  };

  const checkUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('birthday, is_admin')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking user profile:', error);
        return { hasCompleteProfile: false, isAdmin: false };
      }

      return {
        hasCompleteProfile: data ? data.birthday !== null : false,
        isAdmin: data?.is_admin === true,
      };
    } catch (error) {
      console.error('Error checking user profile:', error);
      return { hasCompleteProfile: false, isAdmin: false };
    }
  };

  const createOrUpdateProfile = async (userId, userData = {}) => {
    try {
      const fullName = userData.name || userData.full_name || '';
      const nameParts = fullName.split(' ');
      const firstName = userData.given_name || userData.first_name || nameParts[0] || '';
      const lastName = userData.family_name || userData.last_name || nameParts.slice(1).join(' ') || '';

      const profile = {
        id: userId,
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString(),
      };

      if (birthdayData) {
        profile.birthday = birthdayData;
      }

      const { error } = await supabase.from('profiles').upsert(profile);
      if (error) throw error;

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
    try {
      await createOrUpdateProfile(userId, userMetadata);
      setShowBirthdayModal(false);
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
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session?.user) {
          navigate('/login', { replace: true });
          return;
        }

        const user = data.session.user;
        setUserId(user.id);
        setUserMetadata(user.user_metadata || {});

        await createOrUpdateProfile(user.id, user.user_metadata || {});

        const { hasCompleteProfile, isAdmin } = await checkUserProfile(user.id);

        if (isAdmin) {
          navigate('/admindashboard', { replace: true });
        } else if (!hasCompleteProfile) {
          setShowBirthdayModal(true);
          setLoading(false);
        } else {
          navigate('/home', { replace: true });
        }
      } catch (err) {
        console.error('OAuth callback failed:', err);
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
                        setErrors((prev) => ({ ...prev, birthday: '' }));
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