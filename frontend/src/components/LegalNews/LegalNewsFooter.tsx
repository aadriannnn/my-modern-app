import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Box, Container, SimpleGrid, VStack, Heading, Text,
    Link as ChakraLink, Flex, Icon, useColorModeValue
} from '@chakra-ui/react';
import { useSectionTheme } from '../../context/SectionThemeContext';

const LegalNewsFooter = () => {
    const { themeName } = useSectionTheme();
    const currentYear = new Date().getFullYear();

    const policyLinks = [
        { name: 'Politica de Confidențialitate', path: '/stiri/politica-confidentialitate' },
        { name: 'Politica Editorială', path: '/stiri/politica-editoriala' },
        { name: 'Termeni și Condiții de Utilizare', path: '/stiri/termeni-conditii' },
        { name: 'Condiții de Publicare', path: '/stiri/conditii-publicare' },
    ];

    const aboutLinks = [
        { name: 'Despre Noi', path: '/stiri/despre-noi' },
        { name: 'Contact', path: '/stiri/contact' },
    ];

    interface LinkItem {
        name: string;
        path: string;
    }

    const FooterLinkList = ({ title, links }: { title: string, links: LinkItem[] }) => (
        <VStack align={{ base: 'center', sm: 'flex-start' }} spacing={3}>
            <Heading
                as="h4"
                size="sm"
                fontWeight="semibold"
                mb={1}
                pb={2}
                borderBottomWidth="1px"
                borderColor="whiteAlpha.400"
                display="inline-block"
            // variant={themeName}
            >
                {title}
            </Heading>
            {links.map(link => (
                <ChakraLink
                    key={link.name}
                    as={RouterLink}
                    to={link.path}
                    fontSize="sm"
                    display="block"
                // variant={themeName}
                >
                    {link.name}
                </ChakraLink>
            ))}
        </VStack>
    );

    // Hardcoded colors for now to match "news" theme generally, or use useColorModeValue if needed
    // In the reference, these use specific variants. I'll stick to a dark blue theme for the footer as typical for "news".
    const bg = "gray.900";
    const color = "gray.100";

    return (
        <Box
            as="footer"
            bg={bg}
            color={color}
            pt={{ base: 10, md: 16 }}
            pb={0}
        >
            <Container maxW="1200px">
                <SimpleGrid
                    columns={{ base: 1, sm: 2, md: 3 }}
                    spacing={{ base: 8, md: 10 }}
                    textAlign={{ base: 'center', sm: 'left' }}
                >
                    <FooterLinkList title="Politici" links={policyLinks} />

                    <FooterLinkList title="Companie" links={aboutLinks} />

                    <VStack
                        align={{ base: 'center', sm: 'flex-start' }}
                        spacing={2}
                        mt={{ base: 4, sm: 0 }}
                    >
                        <Heading as="h5" size="md" fontWeight="bold">
                            LegeaAplicata.ro
                        </Heading>
                        <Text fontSize="sm" pt={4}>
                            &copy; {currentYear} Toate drepturile rezervate.
                        </Text>
                        <Text fontSize="sm">
                            Un proiect{' '}
                            <ChakraLink
                                href="https://www.verdictline.com"
                                isExternal
                                fontWeight="medium"
                                color="blue.200"
                            >
                                Verdict Line
                            </ChakraLink>.
                        </Text>
                    </VStack>
                </SimpleGrid>

            </Container>

            {/* Bottom Bar */}
            <Box mt={{ base: 8, md: 12 }} py={4} bg="blackAlpha.300">
                <Container maxW="1200px">
                    <Flex
                        direction={{ base: 'column', sm: 'row' }}
                        justify="center"
                        align="center"
                        textAlign="center"
                    >
                        <Text fontSize="xs" color="gray.400">
                            Platformă Știri Juridice LegeaAplicata
                        </Text>
                    </Flex>
                </Container>
            </Box>
        </Box>
    );
};

export default LegalNewsFooter;
