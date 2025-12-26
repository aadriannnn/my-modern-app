import React from 'react';
import {
    Box,
    Text,
    HStack,
    Icon,
    useBreakpointValue,
    Center,
    keyframes
} from '@chakra-ui/react';
import { FaPhoneAlt, FaHandshake } from 'react-icons/fa';

const scrollX = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
`;

const bannerItems = [
    { text: 'Call center cu suport specializat', icon: FaPhoneAlt },
    { text: 'Program Dezvoltat în Parteneriat cu ICI București - Institutul Național de Cercetare-Dezvoltare în Informatică', icon: FaHandshake },
    { text: 'Call center cu suport specializat', icon: FaPhoneAlt },
    { text: 'Program Dezvoltat în Parteneriat cu ICI București - Institutul Național de Cercetare-Dezvoltare în Informatică', icon: FaHandshake },
    { text: 'Call center cu suport specializat', icon: FaPhoneAlt },
    { text: 'Program Dezvoltat în Parteneriat cu ICI București - Institutul Național de Cercetare-Dezvoltare în Informatică', icon: FaHandshake },
];

const animationDuration = 55;

const ScrollingBannerCSS = () => {
    const itemPaddingX = useBreakpointValue({ base: 5, md: 8 });
    const fontSize = useBreakpointValue({ base: 'sm', md: 'sm' });
    const iconSize = useBreakpointValue({ base: "1.1em", md: "1.1em" });
    const textColor = "gray.700";
    const iconColor = "blue.600";
    const backgroundColor = "gray.50";
    const separatorColor = "gray.300";
    const borderColor = "gray.200";

    const scrollAnimation = `${scrollX} ${animationDuration}s linear infinite`;

    return (
        <Box
            bg={backgroundColor}
            py={2}
            overflow="hidden"
            borderBottom="1px"
            borderColor={borderColor}
            _hover={{ animationPlayState: 'paused' }}
        >
            <Box
                display="inline-block"
                whiteSpace="nowrap"
                animation={scrollAnimation}
            >
                <HStack spacing={0} display="inline-flex" alignItems="center">
                    {bannerItems.map((item, index) => (
                        <Center
                            key={`item-1-${index}`}
                            px={itemPaddingX}
                            py={1}
                            h="100%"
                        >
                            <HStack spacing={2} align="center">
                                <Icon as={item.icon} boxSize={iconSize} color={iconColor} />
                                <Text fontSize={fontSize} fontWeight="medium" color={textColor}>
                                    {item.text}
                                </Text>
                            </HStack>
                            {index < bannerItems.length - 1 && (
                                <Text mx={itemPaddingX} color={separatorColor} fontSize="lg" display={{ base: 'none', md: 'inline' }}>|</Text>
                            )}
                            {index === bannerItems.length - 1 && <Box w={itemPaddingX} />}
                        </Center>
                    ))}
                </HStack>
                <HStack spacing={0} display="inline-flex" alignItems="center">
                    {bannerItems.map((item, index) => (
                        <Center
                            key={`item-2-${index}`}
                            px={itemPaddingX}
                            py={1}
                            h="100%"
                        >
                            <HStack spacing={2} align="center">
                                <Icon as={item.icon} boxSize={iconSize} color={iconColor} />
                                <Text fontSize={fontSize} fontWeight="medium" color={textColor}>
                                    {item.text}
                                </Text>
                            </HStack>
                            {index < bannerItems.length - 1 && (
                                <Text mx={itemPaddingX} color={separatorColor} fontSize="lg" display={{ base: 'none', md: 'inline' }}>|</Text>
                            )}
                            {index === bannerItems.length - 1 && <Box w={itemPaddingX} />}
                        </Center>
                    ))}
                </HStack>
            </Box>
        </Box>
    );
};

export default ScrollingBannerCSS;
