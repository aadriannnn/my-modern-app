import React from 'react';
import { Link } from 'react-router-dom';
import {
    ExternalLink,
    Info,
    AlertCircle,
    MapPin,
    Briefcase,
    Calendar,
    Users,
    User,
    type LucideIcon
} from 'lucide-react';
import type { Article, Author, Book, Event, Job, LegalNewsSearchResultItem } from '../../hooks/useLegalNewsData';

// Helper for date formatting
const formatDate = (dateInput: string | Date | undefined): string => {
    if (!dateInput) return '';
    try {
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (isNaN(date.getTime())) { throw new Error("Invalid date object"); }
        return date.toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (error) {
        console.error("Error formatting date:", dateInput, error);
        return 'Dată invalidă';
    }
};

type NewsItemType = Article | Author | Book | Event | Job | LegalNewsSearchResultItem | any;

interface NewsItemProps {
    item: NewsItemType;
    blockType: string;
    headingColor: string;
    textColor: string;
    linkColor: string;
    linkHoverColor: string;
    subtleTextColor: string;
    borderColor: string;
}

const NewsItemComponent: React.FC<NewsItemProps> = ({
    item,
    blockType,
    // headingColor,
    // textColor,
    // linkColor,
    // linkHoverColor,
    // subtleTextColor,
    borderColor
}) => {
    let itemLink = '#';
    let isExternal = false;
    let displayImage: string | undefined | null = null;
    let title = item.title || item.name || 'Titlu/Nume lipsă';

    interface MetaData {
        icon?: LucideIcon;
        text?: string;
        isAuthor?: boolean;
        isDate?: boolean;
    }
    let metaData: MetaData[] = [];

    const itemType = (item as any).matchType || 'article';

    switch (blockType) {
        case 'careers':
            itemLink = item.applyLink || '#';
            isExternal = true;
            displayImage = item.companyLogoUrl;
            title = item.title;
            metaData = [
                item.company && { icon: Briefcase, text: item.company },
                item.location && { icon: MapPin, text: item.location },
                item.postedDateObject && { icon: Calendar, text: formatDate(item.postedDateObject) }
            ].filter(Boolean) as MetaData[];
            break;
        case 'events':
            itemLink = item.detailsLink || '#';
            isExternal = typeof itemLink === 'string' && !itemLink.startsWith('/');
            displayImage = null; // Event block usually text only list in sidebars unless specified
            title = item.title;
            metaData = [
                item.dateObject && { icon: Calendar, text: formatDate(item.dateObject) },
                item.location && { icon: MapPin, text: item.location }
            ].filter(Boolean) as MetaData[];
            break;
        case 'books':
            itemLink = item.slug ? `/stiri/carte/${item.slug}` : '#';
            isExternal = false;
            displayImage = item.coverImageUrl;
            title = item.title;
            metaData = [
                item.authors && (Array.isArray(item.authors) ? item.authors.length > 0 : !!item.authors) && {
                    icon: Users,
                    text: Array.isArray(item.authors) ? item.authors.join(', ') : item.authors
                },
                item.publishDateObject && { icon: Calendar, text: formatDate(item.publishDateObject) }
            ].filter(Boolean) as MetaData[];
            break;
        case 'professionals':
        case 'authors':
            itemLink = item.profileUrl || (item.id ? `/stiri/autor/${item.id}` : '#');
            isExternal = typeof itemLink === 'string' && itemLink !== '#' && !itemLink.startsWith('/');
            displayImage = item.imageUrl;
            title = item.name;
            metaData = [
                item.title && { icon: Briefcase, text: item.title }
            ].filter(Boolean) as MetaData[];
            break;
        case 'search-results':
            if (itemType === 'article') {
                itemLink = item.slug ? `/stiri/articol/${item.slug}` : '#';
                isExternal = false;
                displayImage = item.imageUrl || (item.imageFileName ? `/data/legal_news/images/${item.imageFileName}` : null);
                title = item.title || 'Titlu articol lipsă';
                metaData = [
                    item.authorName && { text: item.authorName, isAuthor: true },
                    item.publishDate && { icon: Calendar, text: formatDate(item.publishDate), isDate: true }
                ].filter(Boolean) as MetaData[];
            } else if (itemType === 'author') {
                itemLink = item.profileUrl || (item.id ? `/stiri/autor/${item.id}` : '#');
                isExternal = typeof itemLink === 'string' && itemLink !== '#' && !itemLink.startsWith('/');
                displayImage = item.imageUrl;
                title = item.name || 'Nume autor lipsă';
                metaData = [
                    item.title && { icon: Briefcase, text: item.title }
                ].filter(Boolean) as MetaData[];
            } else if (itemType === 'book') {
                itemLink = item.slug ? `/stiri/carte/${item.slug}` : '#';
                isExternal = false;
                displayImage = item.coverImageUrl;
                title = item.title || 'Titlu carte lipsă';
                metaData = [
                    item.authors && { icon: Users, text: Array.isArray(item.authors) ? item.authors.join(', ') : item.authors },
                    item.publishDate && { icon: Calendar, text: formatDate(item.publishDate) }
                ].filter(Boolean) as MetaData[];
            } else {
                title = item.title || item.name || 'Rezultat necunoscut';
                itemLink = '#';
                isExternal = false;
                metaData = [];
            }
            break;
        default:
            if (item.slug) {
                itemLink = `/stiri/articol/${item.slug}`;
                isExternal = false;
            } else if (item.externalUrl) {
                itemLink = item.externalUrl;
                isExternal = true;
            }
            displayImage = item.imageUrl || (item.imageFileName ? `/data/legal_news/images/${item.imageFileName}` : null);
            title = item.title || 'Titlu lipsă';
            metaData = [
                item.authorName && { text: item.authorName, isAuthor: true },
                item.publishDate && { icon: Calendar, text: formatDate(item.publishDate), isDate: true }
            ].filter(Boolean) as MetaData[];
            break;
    }

    const hasImage = !!displayImage;
    const isProfileType = blockType === 'professionals' || blockType === 'authors' || itemType === 'author';
    const isBookType = blockType === 'books' || itemType === 'book';
    const isCareerType = blockType === 'careers';

    // CSS Classes construction
    const borderColorClass = borderColor.startsWith('gray') ? 'border-gray-200 dark:border-gray-700' : 'border-gray-200'; // Simplification

    // Dynamic styles usually handled by classes in Tailwind, we map props to arbitrary colors if needed or stick to theme
    // For specific colors passed as props (e.g. from context defaults), we might need inline styles or strict mapping.
    // Assuming standard gray/blue theme as per Header/Footer for consistency.

    return (
        <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 w-full pb-4 border-b ${borderColorClass} last:border-0 last:pb-1`}>
            {hasImage && (
                <div
                    className={`flex-shrink-0 bg-gray-50 dark:bg-gray-800 overflow-hidden mb-2 sm:mb-0
                        ${isProfileType ? 'rounded-full w-[60px] h-[60px] sm:w-[65px] sm:h-[65px]' : ''}
                        ${isCareerType ? 'rounded-sm w-[60px] h-auto sm:w-[45px] sm:h-[45px]' : ''}
                        ${!isProfileType && !isCareerType ? (isBookType ? 'rounded-md w-[60px] h-auto sm:w-[80px] sm:h-[100px]' : 'rounded-md w-[60px] h-auto sm:w-[80px] sm:h-[65px]') : ''}
                    `}
                >
                    <LinkOrAnchor itemLink={itemLink} isExternal={isExternal} className="block w-full h-full">
                        <img
                            src={displayImage!}
                            alt={title}
                            loading="lazy"
                            className={`w-full h-full ${isBookType || isCareerType ? 'object-contain' : 'object-cover'}`}
                        />
                    </LinkOrAnchor>
                </div>
            )}

            {!hasImage && isProfileType && (
                <div className="flex-shrink-0 w-[60px] h-[60px] sm:w-[65px] sm:h-[65px] mb-2 sm:mb-0 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400">
                    <User className="h-8 w-8" />
                </div>
            )}

            <div className={`flex-1 ${hasImage || isProfileType ? '' : 'pt-1'}`}>
                <h4 className="mb-1 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">
                    <LinkOrAnchor
                        itemLink={itemLink}
                        isExternal={isExternal}
                        className={`hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors
                            ${(isProfileType || isCareerType || blockType === 'events') ? 'line-clamp-2' : 'line-clamp-3'}
                        `}
                    >
                        {title}
                    </LinkOrAnchor>
                </h4>

                <div className="flex flex-col items-start text-xs text-gray-500 dark:text-gray-400 mt-1 gap-1">
                    {metaData.map((meta, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                            {meta.icon && <meta.icon className="h-3 w-3 text-gray-400" />}
                            <span
                                className={`
                                    ${meta.isAuthor ? 'font-medium text-gray-600 dark:text-gray-300' : ''}
                                    ${isBookType ? 'line-clamp-2' : 'line-clamp-1'}
                                `}
                            >
                                {!isCareerType && blockType !== 'events' && !isBookType && !isProfileType && meta.isDate && metaData.find(m => m.isAuthor) && '• '}
                                {meta.text}
                            </span>
                        </div>
                    ))}

                    {isCareerType && (
                        <div className="pt-1">
                            <LinkOrAnchor
                                itemLink={itemLink}
                                isExternal={isExternal}
                                className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                            >
                                Vezi detalii / Aplică <ExternalLink className="h-3 w-3" />
                            </LinkOrAnchor>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Sub-component for Link vs Anchor logic
const LinkOrAnchor: React.FC<{ itemLink: string, isExternal: boolean, children: React.ReactNode, className?: string }> = ({
    itemLink, isExternal, children, className
}) => {
    if (itemLink === '#') return <div className={className}>{children}</div>;

    if (isExternal) {
        return (
            <a href={itemLink} target="_blank" rel="noopener noreferrer" className={className}>
                {children}
            </a>
        );
    }
    return (
        <Link to={itemLink} className={className}>
            {children}
        </Link>
    );
};


interface NewsBlockProps {
    title?: string;
    items?: any[];
    blockType?: string;
    isLoading?: boolean;
    error?: string | null;
    headingColor?: string; // Kept for prop compat, mapped to Tailwind classes where possible
    textColor?: string;
    linkColor?: string;
    linkHoverColor?: string;
    subtleTextColor?: string;
    borderColor?: string;
    titleProps?: any;
    authors?: Author[];
    className?: string; // allow overriding container class
}

const NewsBlock: React.FC<NewsBlockProps> = ({
    title,
    items = [],
    blockType = 'default',
    isLoading = false,
    error = null,
    // Prop drilling for colors is less effective with Tailwind utility classes,
    // relying on defaults or basic prop mapping.
    headingColor = "text-gray-800",
    textColor = "text-gray-700",
    linkColor = "text-blue-600",
    linkHoverColor = "text-blue-700",
    subtleTextColor = "text-gray-500",
    borderColor = "border-gray-200",
    // titleProps,
    className
}) => {

    // Skeleton loader
    if (isLoading) {
        return (
            <div className={`w-full ${className || ''}`}>
                {title && <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse"></div>}
                <div className="flex flex-col space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex gap-4 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                            <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={`w-full ${className || ''}`}>
                {title && <h3 className="text-md font-semibold mb-4 text-gray-800 dark:text-gray-200">{title}</h3>}
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 flex items-start gap-3 text-red-700 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">{error || 'A apărut o eroare.'}</span>
                </div>
            </div>
        );
    }

    // Empty state
    if (!items || items.length === 0) {
        let message = "Nu există elemente disponibile.";
        if (blockType === 'careers') message = "Nu există oportunități de carieră disponibile.";
        else if (blockType === 'events') message = "Nu există evenimente viitoare.";
        else if (blockType === 'books') message = "Nu există cărți disponibile.";
        else if (blockType === 'professionals') message = "Nu există profesioniști disponibili.";
        else if (blockType === 'authors') message = "Nu există autori disponibili.";
        else if (blockType === 'search-results') message = "Niciun rezultat găsit.";

        return (
            <div className={`w-full ${className || ''}`}>
                {title && <h3 className="text-md font-semibold mb-4 text-gray-800 dark:text-gray-200">{title}</h3>}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-4 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center gap-2">
                    <Info className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm">{message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full ${className || ''}`}>
            {title && (
                <h3 className="text-md font-semibold mb-4 text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800 pb-2">
                    {title}
                </h3>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {items.filter(item => !!item).map((item, index) => (
                    <NewsItemComponent
                        key={`${blockType}-${item.id || item.slug || 'no-id-slug'}-${index}`}
                        item={item}
                        blockType={blockType}
                        headingColor={headingColor}
                        textColor={textColor}
                        linkColor={linkColor}
                        linkHoverColor={linkHoverColor}
                        subtleTextColor={subtleTextColor}
                        borderColor={borderColor}
                    />
                ))}
            </div>
        </div>
    );
};

export default NewsBlock;
