import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Box,
    VStack,
    Image,
    Heading,
    Text,
    Button,
    Tag,
    Link as ChakraLink,
    useColorModeValue,
} from '@chakra-ui/react';
import { Event } from '../../hooks/useEventsData';

const isExternalLink = (link?: string) => link ? /^https?:\/\//.test(link) : false;

const formatEventDateTime = (dateObject?: Date) => {
    if (!dateObject || !(dateObject instanceof Date) || isNaN(dateObject.getTime())) {
        return 'Dată invalidă';
    }
    const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };

    const formattedDate = dateObject.toLocaleDateString('ro-RO', dateOptions);
    const formattedTime = dateObject.toLocaleTimeString('ro-RO', timeOptions);

    return `${formattedDate}, ${formattedTime}`;
};

interface EventCardProps {
    event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
    const borderColor = useColorModeValue('gray.200', 'gray.700');
    const textColor = useColorModeValue('gray.600', 'gray.400');
    const headingColor = useColorModeValue('gray.800', 'whiteAlpha.900');
    const cardBg = useColorModeValue('white', 'gray.800');

    if (!event) return null;

    const formattedDate = formatEventDateTime(event.dateObject);
    const detailLink = event.pageUrl; // From hook interface
    const isExternal = isExternalLink(detailLink);

    // In hook we didn't add bannerType etc, but reference uses it. 
    // We'll trust the event object might have extra props if we cast or extend, 
    // or just use bannerImageUrl if present.
    const bannerImageUrl = event.bannerImageUrl;

    return (
        <Box
            bg={cardBg}
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="md"
            boxShadow="sm"
            overflow="hidden"
            transition="all 0.2s ease-in-out"
            _hover={{
                boxShadow: 'md',
                transform: 'translateY(-2px)',
            }}
        >
            <VStack spacing={0} align="stretch">
                <Box position="relative" minH="150px">
                    {bannerImageUrl ? (
                        <Image
                            src={bannerImageUrl}
                            alt={`Banner pentru ${event.title}`}
                            w="full"
                            h="150px"
                            objectFit="cover"
                            loading="lazy"
                        />
                    ) : (
                        <Box bg="gray.200" minH="150px" />
                    )}
                </Box>

                <Box p={4}>
                    <Heading
                        as="h3"
                        size="sm"
                        color={headingColor}
                        noOfLines={3}
                        minHeight="3.6em"
                        mb={2}
                        title={event.title}
                    >
                        {event.title}
                    </Heading>
                    <Text fontSize="sm" color={textColor} mb={4}>
                        {formattedDate} {event.location && `• ${event.location}`}
                    </Text>
                    <Button
                        as={isExternal ? ChakraLink : RouterLink}
                        {...(isExternal ? { href: detailLink, isExternal: true } : { to: detailLink || '#' })}
                        variant="outline"
                        colorScheme="blue"
                        size="sm"
                        width="full"
                    >
                        Detalii
                    </Button>
                </Box>
            </VStack>
        </Box>
    );
};

export default EventCard;
