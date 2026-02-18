/**
 * Country Flags Utility
 * Maps DXCC entity names to emoji flags
 */

export const getFlagForEntity = (entityName) => {
    if (!entityName) return null;

    const flagMap = {
        'United States': '🇺🇸',
        'Canada': '🇨🇦',
        'Mexico': '🇲🇽',
        'Brazil': '🇧🇷',
        'Argentina': '🇦🇷',
        'Chile': '🇨🇱',
        'Uruguay': '🇺🇾',
        'Paraguay': '🇵🇾',
        'Peru': '🇵🇪',
        'Colombia': '🇨🇴',
        'Venezuela': '🇻🇪',
        'Ecuador': '🇪🇨',
        'Bolivia': '🇧🇴',
        'United Kingdom': '🇬🇧',
        'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
        'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
        'Northern Ireland': '🇬🇧', // No specific emoji, fall back to UK
        'Ireland': '🇮🇪',
        'France': '🇫🇷',
        'Germany': '🇩🇪',
        'Italy': '🇮🇹',
        'Spain': '🇪🇸',
        'Portugal': '🇵🇹',
        'Netherlands': '🇳🇱',
        'Belgium': '🇧🇪',
        'Luxembourg': '🇱🇺',
        'Switzerland': '🇨🇭',
        'Austria': '🇦🇹',
        'Sweden': '🇸🇪',
        'Norway': '🇳🇴',
        'Denmark': '🇩🇰',
        'Finland': '🇫🇮',
        'Iceland': '🇮🇸',
        'Poland': '🇵🇱',
        'Czech Republic': '🇨🇿',
        'Slovakia': '🇸🇰',
        'Hungary': '🇭🇺',
        'Romania': '🇷🇴',
        'Bulgaria': '🇧🇬',
        'Greece': '🇬🇷',
        'Cyprus': '🇨🇾',
        'Malta': '🇲🇹',
        'Russia': '🇷🇺',
        'Ukraine': '🇺🇦',
        'Belarus': '🇧🇾',
        'Estonia': '🇪🇪',
        'Latvia': '🇱🇻',
        'Lithuania': '🇱🇹',
        'Japan': '🇯🇵',
        'South Korea': '🇰🇷',
        'China': '🇨🇳',
        'Taiwan': '🇹🇼',
        'Hong Kong': '🇭🇰',
        'Macau': '🇲🇴',
        'India': '🇮🇳',
        'Thailand': '🇹🇭',
        'Vietnam': '🇻🇳',
        'Indonesia': '🇮🇩',
        'Malaysia': '🇲🇾',
        'Singapore': '🇸🇬',
        'Philippines': '🇵🇭',
        'Australia': '🇦🇺',
        'New Zealand': '🇳🇿',
        'South Africa': '🇿🇦',
        'Israel': '🇮🇱',
        'Turkey': '🇹🇷',
        'Saudi Arabia': '🇸🇦',
        'UAE': '🇦🇪',
        // Add more as needed based on cty.dat names
    };

    // Direct match
    if (flagMap[entityName]) return flagMap[entityName];

    // Fuzzy match or fallback logic could go here
    // For now, return null if not found
    return null;
};
