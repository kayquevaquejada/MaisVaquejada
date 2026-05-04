import React from 'react';
import SocialFeedScreen from '../social/screens/SocialFeedScreen';

interface SocialFeedViewProps {
  user: any;
  onMediaCreation: () => void;
}

/**
 * SocialFeedView - Entry point for the Social feature.
 * Now refactored into a modular, decoupled architecture inside the /social directory.
 */
const SocialFeedView: React.FC<SocialFeedViewProps> = (props) => {
  return <SocialFeedScreen {...props} />;
};

export default SocialFeedView;
