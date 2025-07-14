class GoogleAuthService {
  constructor() {
    this.isInitialized = false;
    this.initPromise = null;
  }

  // Initialize Google API
  async initialize() {
    if (this.isInitialized) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      // Wait for Google API to be available
      const checkGoogleAPI = () => {
        if (window.gapi && window.google) {
          this.loadAuth2().then(resolve).catch(reject);
        } else {
          setTimeout(checkGoogleAPI, 100);
        }
      };
      
      // Start checking immediately
      checkGoogleAPI();
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.isInitialized) {
          reject(new Error('Google API failed to load within timeout'));
        }
      }, 10000);
    });

    return this.initPromise;
  }

  async loadAuth2() {
    return new Promise((resolve, reject) => {
      try {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        
        // Debug environment variables
        console.log('=== Environment Variables Debug ===');
        console.log('All env variables:', import.meta.env);
        console.log('VITE_GOOGLE_CLIENT_ID:', clientId);
        console.log('Client ID length:', clientId ? clientId.length : 'undefined');
        console.log('Client ID type:', typeof clientId);
        console.log('===================================');
        
        if (!clientId) {
          reject(new Error('Google Client ID not found in environment variables'));
          return;
        }

        console.log('Initializing with Client ID:', clientId);

        window.gapi.load('auth2', {
          callback: () => {
            window.gapi.auth2.init({
              client_id: clientId,
              scope: 'email profile'
            }).then(() => {
              this.isInitialized = true;
              console.log('Google Auth initialized successfully');
              resolve();
            }).catch((error) => {
              console.error('Failed to initialize Google Auth2:', error);
              console.error('Error details:', {
                error: error.error,
                details: error.details
              });
              reject(error);
            });
          },
          onerror: (error) => {
            console.error('Failed to load Google Auth2:', error);
            reject(error);
          }
        });
      } catch (error) {
        console.error('Error in loadAuth2:', error);
        reject(error);
      }
    });
  }

  // Sign in with Google
  async signIn() {
    try {
      await this.initialize();
      
      const authInstance = window.gapi.auth2.getAuthInstance();
      if (!authInstance) {
        throw new Error('Google Auth instance not available');
      }

      const googleUser = await authInstance.signIn({
        scope: 'email profile'
      });

      const profile = googleUser.getBasicProfile();
      const authResponse = googleUser.getAuthResponse();

      return {
        sub: profile.getId(),
        email: profile.getEmail(),
        name: profile.getName(),
        picture: profile.getImageUrl(),
        email_verified: true,
        access_token: authResponse.access_token,
        id_token: authResponse.id_token
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // Sign out
  async signOut() {
    try {
      if (!this.isInitialized) return;
      
      const authInstance = window.gapi.auth2.getAuthInstance();
      if (authInstance) {
        await authInstance.signOut();
        console.log('Signed out successfully');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Check if user is signed in
  isSignedIn() {
    try {
      if (!this.isInitialized) return false;
      
      const authInstance = window.gapi.auth2.getAuthInstance();
      return authInstance ? authInstance.isSignedIn.get() : false;
    } catch (error) {
      console.error('Error checking sign in status:', error);
      return false;
    }
  }

  // Get current user
  getCurrentUser() {
    try {
      if (!this.isInitialized || !this.isSignedIn()) return null;
      
      const authInstance = window.gapi.auth2.getAuthInstance();
      const googleUser = authInstance.currentUser.get();
      const profile = googleUser.getBasicProfile();
      const authResponse = googleUser.getAuthResponse();

      return {
        sub: profile.getId(),
        email: profile.getEmail(),
        name: profile.getName(),
        picture: profile.getImageUrl(),
        email_verified: true,
        access_token: authResponse.access_token,
        id_token: authResponse.id_token
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
}

// Create singleton instance
const googleAuthService = new GoogleAuthService();
export default googleAuthService;
