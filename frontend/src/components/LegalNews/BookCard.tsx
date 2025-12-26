import React from 'react';
import { Box, VStack, Image, Heading, Text, LinkBox, LinkOverlay, useColorModeValue } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { Book } from '../../hooks/useLegalNewsData';

interface BookCardProps {
    book: Book;
    headingColor?: string;
    textColor?: string;
    linkColor?: string;
    linkHoverColor?: string;
    subtleTextColor?: string;
}

const BookCard: React.FC<BookCardProps> = ({
    book,
    headingColor,
    textColor,
    // linkColor,
    // linkHoverColor,
    subtleTextColor
}) => {
    const cardBg = useColorModeValue("white", "gray.700");
    const cardBorderColor = useColorModeValue("gray.200", "gray.600");
    const imageContainerBg = useColorModeValue("gray.100", "gray.600");
    const defaultAuthorColor = useColorModeValue("gray.500", "gray.400");
    const finalAuthorColor = subtleTextColor || defaultAuthorColor;

    let authorsDisplay = '';
    if (Array.isArray(book.authors)) {
        authorsDisplay = book.authors.join(', ');
    } else if (typeof book.authors === 'string') {
        authorsDisplay = book.authors;
    }

    const detailLink = book.slug ? `/stiri/carte/${book.slug}` : '#';

    return (
        <LinkBox
            as="article"
            bg={cardBg}
            borderWidth="1px"
            borderColor={cardBorderColor}
            borderRadius="md"
            overflow="hidden"
            transition="all 0.2s ease-in-out"
            h="full"
            _hover={{
                boxShadow: 'md',
                transform: 'translateY(-3px)',
            }}
        >
            <VStack spacing={3} align="stretch" h="full">
                <Box position="relative" w="full" pt="100%" bg={imageContainerBg}>
                    <Image
                        src={book.coverImageUrl || 'https://via.placeholder.com/200x250.png?text=Copertă'}
                        alt={`Copertă ${book.title || 'carte'}`}
                        position="absolute"
                        top="0"
                        left="0"
                        width="full"
                        height="full"
                        objectFit="contain"
                        fallbackSrc='https://via.placeholder.com/200x250.png?text=Lipsă'
                        p={2}
                    />
                </Box>

                <VStack spacing={1} p={4} pt={2} align="stretch" flexGrow={1}>
                    <Heading size="sm" fontWeight="medium" lineHeight="short" noOfLines={3} minH="3.6em" color={headingColor || "inherit"}>
                        <LinkOverlay as={RouterLink} to={detailLink}>
                            {book.title || 'Titlu indisponibil'}
                        </LinkOverlay>
                    </Heading>

                    {authorsDisplay && (
                        <Text fontSize="xs" color={finalAuthorColor} noOfLines={2} minH="2.4em">
                            {authorsDisplay}
                        </Text>
                    )}
                </VStack>
            </VStack>
        </LinkBox>
    );
};

export default BookCard;
