# com.synology.surveillance
Control Synology Surveillance Station from Homey (www.athom.com)

To be able to use this app, you need to supply the app with the IP of the Synology NAS, as well as the username and password of an admin. 

1. Make sure to add a user that doesn't require 2 factor authentication. 
2. Add the user to the 'administrators' group, because of the required permissions.
3. Under 'applications', allow the user to access the Surveillance Station

The following cards are available:
- [ACTION] Start recording
- [ACTION] Stop recording
- [ACTION] Take snapshot (will go to /USERNAME/@Snapshot/ on your Synology)
- [ACTION] Mail snapshot (first fill in SMTP settings under 'Settings' in Homey!)
- [CONDITION] Is the camera recording?
- [CONDITION] Is the camera available?

Use at your own risk, I accept no responsibility for any damages caused by using this script.

# Changelog
**Version 1.1.0**
- Removed requirement of external node modules, which makes the package much smaller
- Now supports multiple Synology NAS devices, settings get stored per camera
- Login & Logout per action, to support multiple NAS devices and at the same time this prevents a lockout when Synology decides the session ID has expired

**Version 1.0.3:**
- There now is a 'test' button in the settings menu. This will test your mail settings and display it either being sent successful, or return the error.

**Version 1.0.0:**
Initial version