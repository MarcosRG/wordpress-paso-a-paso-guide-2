import { useEffect } from "react";
import Index from "@/pages/Index";

/**
 * WordPress Shortcode Integration Component
 *
 * This component is designed to be embedded in WordPress pages via shortcode.
 *
 * To use this in WordPress:
 *
 * 1. Build the application: npm run build
 * 2. Upload the dist/ folder to your WordPress subdomain
 * 3. Add this shortcode to functions.php:
 *
 * function bikesul_rental_shortcode($atts) {
 *   wp_enqueue_script('bikesul-app', 'https://your-subdomain.bikesultoursgest.com/assets/index.js', [], '1.0', true);
 *   wp_enqueue_style('bikesul-app', 'https://your-subdomain.bikesultoursgest.com/assets/index.css', [], '1.0');
 *
 *   return '<div id="bikesul-rental-app"></div>';
 * }
 * add_shortcode('bikesul_rental', 'bikesul_rental_shortcode');
 *
 * 4. Use the shortcode in any page: [bikesul_rental]
 *
 * WordPress Integration Features:
 * - Seamless integration with WooCommerce checkout
 * - Automatic order creation with proper metadata
 * - Multi-language support (PT/EN)
 * - Responsive design
 * - Mobile-friendly interface
 */

interface WordPressEmbedProps {
  // WordPress-specific props
  siteUrl?: string;
  language?: "pt" | "en";
  customCss?: string;
}

const WordPressEmbed = ({
  siteUrl,
  language = "pt",
  customCss,
}: WordPressEmbedProps) => {
  useEffect(() => {
    // Set WordPress context
    if (siteUrl) {
      window.WORDPRESS_SITE_URL = siteUrl;
    }

    // Apply custom CSS if provided
    if (customCss) {
      const style = document.createElement("style");
      style.textContent = customCss;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, [siteUrl, customCss]);

  return (
    <div className="bikesul-wordpress-embed">
      {/* Add WordPress-specific styling */}
      <style>{`
        .bikesul-wordpress-embed {
          max-width: 100%;
          margin: 0 auto;
        }
        
        /* Ensure compatibility with WordPress themes */
        .bikesul-wordpress-embed * {
          box-sizing: border-box;
        }
        
        /* Override potential WordPress theme conflicts */
        .bikesul-wordpress-embed .card {
          background: white !important;
          border: 1px solid #e5e7eb !important;
        }
        
        .bikesul-wordpress-embed .button {
          text-decoration: none !important;
        }
      `}</style>

      <Index />
    </div>
  );
};

export default WordPressEmbed;

// Global types for WordPress integration
declare global {
  interface Window {
    WORDPRESS_SITE_URL?: string;
  }
}
