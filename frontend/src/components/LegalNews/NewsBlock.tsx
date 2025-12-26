import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Box, Heading, Text, Icon, Image, VStack, HStack, Flex,
    Link as ChakraLink,
    SkeletonCircle, SkeletonText,
    Alert, AlertIcon, AlertDescription, Center,
    useColorModeValue,
    BoxProps
} from '@chakra-ui/react';
import { FiExternalLink, FiInfo, FiAlertCircle, FiMapPin, FiBriefcase, FiCalendar, FiUsers, FiUser } from 'react-icons/fi';
import { Article, Author, Book } from '../../hooks/useLegalNewsData';
import { Event } from '../../hooks/useEventsData';

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

type NewsItemType = Article | Author | Book | Event | any; // 'any' for jobs or mixed types

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
    headingColor,
    textColor,
    linkColor,
    linkHoverColor,
    subtleTextColor,
    borderColor
}) => {
    let itemLink = '#';
    let isExternal = false;
    let displayImage: string | undefined | null = null;
    let title = item.title || item.name || 'Titlu/Nume lipsă';

    interface MetaData {
        icon?: any;
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
                item.company && { icon: FiBriefcase, text: item.company },
                item.location && { icon: FiMapPin, text: item.location },
                item.postedDateObject && { icon: FiCalendar, text: formatDate(item.postedDateObject) }
            ].filter(Boolean) as MetaData[];
            break;
        case 'events':
            itemLink = item.detailsLink || '#';
            isExternal = typeof itemLink === 'string' && !itemLink.startsWith('/');
            displayImage = null;
            title = item.title;
            metaData = [
                item.dateObject && { icon: FiCalendar, text: formatDate(item.dateObject) },
                item.location && { icon: FiMapPin, text: item.location }
            ].filter(Boolean) as MetaData[];
            break;
        case 'books':
            itemLink = item.slug ? `/stiri/carte/${item.slug}` : '#';
            isExternal = false;
            displayImage = item.coverImageUrl;
            title = item.title;
            metaData = [
                item.authors && item.authors.length > 0 && { icon: FiUsers, text: item.authors.join(', ') },
                item.publishDateObject && { icon: FiCalendar, text: formatDate(item.publishDateObject) }
            ].filter(Boolean) as MetaData[];
            break;
        case 'professionals':
        case 'authors':
            itemLink = item.profileUrl || (item.id ? `/stiri/autor/${item.id}` : '#');
            isExternal = typeof itemLink === 'string' && itemLink !== '#' && !itemLink.startsWith('/');
            displayImage = item.imageUrl;
            title = item.name;
            metaData = [
                item.title && { icon: FiBriefcase, text: item.title }
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
                    item.publishDate && { icon: FiCalendar, text: formatDate(item.publishDate), isDate: true }
                ].filter(Boolean) as MetaData[];
            } else if (itemType === 'author') {
                itemLink = item.profileUrl || (item.id ? `/stiri/autor/${item.id}` : '#');
                isExternal = typeof itemLink === 'string' && itemLink !== '#' && !itemLink.startsWith('/');
                displayImage = item.imageUrl;
                title = item.name || 'Nume autor lipsă';
                metaData = [
                    item.title && { icon: FiBriefcase, text: item.title }
                ].filter(Boolean) as MetaData[];
            } else if (itemType === 'book') {
                itemLink = item.slug ? `/stiri/carte/${item.slug}` : '#';
                isExternal = false;
                displayImage = item.coverImageUrl;
                title = item.title || 'Titlu carte lipsă';
                metaData = [
                    item.authors && item.authors.length > 0 && { icon: FiUsers, text: item.authors.join(', ') },
                    item.publishDate && { icon: FiCalendar, text: formatDate(item.publishDate) }
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
                item.publishDate && { icon: FiCalendar, text: formatDate(item.publishDate), isDate: true }
            ].filter(Boolean) as MetaData[];
            break;
    }

    const hasImage = !!displayImage;
    const isProfileType = blockType === 'professionals' || blockType === 'authors' || itemType === 'author';
    const isBookType = blockType === 'books' || itemType === 'book';
    const isCareerType = blockType === 'careers';

    const LinkWrapper = ({ children, ...props }: any) => {
        const showExternalIcon = isExternal && itemLink !== '#';
        if (itemLink === '#') {
            return <Box {...props}>{children}</Box>;
        }
        const linkProps = {
            color: linkColor,
            _hover: { textDecoration: 'underline', color: linkHoverColor }
        };
        return isExternal ? (
            <ChakraLink href={itemLink} isExternal {...linkProps} {...props}>
                {children} {showExternalIcon && !isCareerType && <Icon as={FiExternalLink} mx="2px" verticalAlign="middle" fontSize="xs" />}
            </ChakraLink>
        ) : (
            <ChakraLink as={RouterLink} to={itemLink} {...linkProps} {...props}>
                {children}
            </ChakraLink>
        );
    };

    return (
        <Flex
            direction={{ base: 'column', sm: 'row' }}
            align="start"
            gap={{ base: 3, sm: 4 }}
            w="full"
            pb={4}
            borderBottomWidth="1px"
            borderColor={borderColor}
            _last={{ borderBottomWidth: '0px', pb: 1 }}
        >
            {hasImage && (
                <Box flexShrink={0} w={{ base: '60px', sm: (isCareerType ? '45px' : (isProfileType ? '65px' : '80px')) }} h={{ base: 'auto', sm: (isCareerType ? '45px' : (isBookType ? '100px' : '65px')) }} mb={{ base: 2, sm: 0 }} overflow="hidden" borderRadius={isProfileType ? 'full' : (isCareerType ? 'sm' : 'md')} bg="gray.50">
                    <LinkWrapper _hover={{}}>
                        <Image src={displayImage!} alt={title} loading="lazy" width="full" height="full" objectFit={(isBookType || isCareerType) ? 'contain' : 'cover'} fallbackSrc={`https://via.placeholder.com/${isCareerType ? '45x45' : (isBookType ? '80x100' : '65x65')}.png?text=...`} borderRadius={isProfileType ? 'full' : (isCareerType ? 'sm' : 'md')} />
                    </LinkWrapper>
                </Box>
            )}
            {!hasImage && isProfileType && (
                <Center flexShrink={0} w={{ base: '60px', sm: '65px' }} h={{ base: 'auto', sm: '65px' }} mb={{ base: 2, sm: 0 }} bg="gray.100" borderRadius="full">
                    <Icon as={FiUser} boxSize="30px" color="gray.400" />
                </Center>
            )}

            <Box flexGrow={1} pt={hasImage || isProfileType ? 0 : 1}>
                <Heading as="h4" size="sm" mb={1} fontWeight="semibold" lineHeight="short" color={headingColor}>
                    <LinkWrapper _hover={{ color: linkHoverColor }}>
                        <Text noOfLines={(isProfileType || isCareerType || blockType === 'events') ? 2 : 3}>
                            {title}
                        </Text>
                    </LinkWrapper>
                </Heading>

                <VStack
                    align="start"
                    spacing={1}
                    wrap="wrap"
                    fontSize="xs"
                    color={subtleTextColor}
                    mt={1}
                >
                    {metaData.map((meta, index) => (
                        <HStack key={index} spacing={1.5} align="center">
                            {meta.icon && <Icon as={meta.icon} boxSize="12px" />}
                            <Text
                                fontWeight={meta.isAuthor ? 'medium' : 'normal'}
                                color={meta.isAuthor ? textColor : subtleTextColor}
                                noOfLines={isBookType ? 2 : 1}
                            >
                                {!isCareerType && blockType !== 'events' && !isBookType && !isProfileType && meta.isDate && metaData.find(m => m.isAuthor) && '• '}
                                {meta.text}
                            </Text>
                        </HStack>
                    ))}
                    {isCareerType && (
                        <Box pt={1}>
                            <LinkWrapper fontWeight="medium" fontSize="xs">
                                Vezi detalii / Aplică <Icon as={FiExternalLink} mx="2px" verticalAlign="middle" />
                            </LinkWrapper>
                        </Box>
                    )}
                </VStack>
            </Box>
        </Flex>
    );
};

interface NewsBlockProps extends BoxProps {
    title?: string;
    items?: any[];
    blockType?: string;
    isLoading?: boolean;
    error?: string | null;
    headingColor?: string;
    textColor?: string;
    linkColor?: string;
    linkHoverColor?: string;
    subtleTextColor?: string;
    borderColor?: string;
    titleProps?: any;
    authors?: Author[];
}

const NewsBlock: React.FC<NewsBlockProps> = ({
    title,
    items = [],
    blockType = 'default',
    isLoading = false,
    error = null,
    headingColor: parentHeadingColor,
    textColor: parentTextColor,
    linkColor: parentLinkColor,
    linkHoverColor: parentLinkHoverColor,
    subtleTextColor: parentSubtleTextColor,
    borderColor: parentBorderColor,
    titleProps,
    authors, // Props unused in this implementation but kept for interface compat if needed
    ...rest
}) => {
    const headingColor = parentHeadingColor || "gray.800";
    const textColor = parentTextColor || "gray.700";
    const linkColor = parentLinkColor || "blue.600";
    const linkHoverColor = parentLinkHoverColor || "blue.700";
    const subtleTextColor = parentSubtleTextColor || "gray.500";
    const borderColor = parentBorderColor || "gray.200";
    const skeletonColorStart = useColorModeValue('gray.100', 'gray.700');
    const skeletonColorEnd = useColorModeValue('gray.300', 'gray.500');
    const errorBg = useColorModeValue("red.50", "red.900");
    const errorColor = useColorModeValue("red.700", "red.200");
    const errorIconColor = useColorModeValue("red.500", "red.300");
    const noItemsBg = useColorModeValue("gray.50", "gray.700");
    const noItemsColor = useColorModeValue("gray.600", "gray.400");

    const renderSkeleton = () => (
        <VStack spacing={4} align="stretch" w="full">
            {[...Array(blockType === 'events' ? 3 : (blockType === 'books' || blockType === 'search-results' ? 4 : 5))]
                .map((_, i) => (
                    <Flex key={i} gap={4} pb={4} borderBottomWidth="1px" borderColor={borderColor} _last={{ borderBottomWidth: '0px', pb: 0 }}>
                        <SkeletonCircle size="50px" startColor={skeletonColorStart} endColor={skeletonColorEnd} />
                        <Box flex='1'>
                            <SkeletonText noOfLines={2} spacing='3' skeletonHeight='3' startColor={skeletonColorStart} endColor={skeletonColorEnd} />
                            <SkeletonText mt={3} noOfLines={1} width="60%" skeletonHeight='2' startColor={skeletonColorStart} endColor={skeletonColorEnd} />
                        </Box>
                    </Flex>
                ))}
        </VStack>
    );

    const renderError = () => (
        <Alert status='error' variant='subtle' borderRadius="md" mt={2} p={3} bg={errorBg}>
            <AlertIcon as={FiAlertCircle} color={errorIconColor} />
            <AlertDescription fontSize="sm" color={errorColor}>
                {error || 'A apărut o eroare.'}
            </AlertDescription>
        </Alert>
    );

    const renderNoItems = () => {
        let message = "Nu există elemente disponibile.";
        if (blockType === 'careers') message = "Nu există oportunități de carieră disponibile.";
        else if (blockType === 'events') message = "Nu există evenimente viitoare.";
        else if (blockType === 'books') message = "Nu există cărți disponibile.";
        else if (blockType === 'professionals') message = "Nu există profesioniști disponibili.";
        else if (blockType === 'authors') message = "Nu există autori disponibili.";
        else if (blockType === 'search-results') message = "Niciun rezultat găsit.";
        return (
            <Center mt={2} p={3} bg={noItemsBg} borderRadius="md">
                <HStack color={noItemsColor}>
                    <Icon as={FiInfo} />
                    <Text fontSize="sm">{message}</Text>
                </HStack>
            </Center>
        );
    };

    return (
        <Box w="full" {...rest}>
            {title && (
                <Heading
                    as="h3"
                    size="md"
                    mb={4}
                    color={headingColor}
                    fontWeight="semibold"
                    {...titleProps}
                >
                    {title}
                </Heading>
            )}

            {isLoading && renderSkeleton()}
            {!isLoading && error && renderError()}
            {!isLoading && !error && items && items.length > 0 && (
                <VStack spacing={0} align="stretch">
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
                </VStack>
            )}
            {!isLoading && !error && (!items || items.length === 0) && renderNoItems()}
        </Box>
    );
};

export default NewsBlock;
