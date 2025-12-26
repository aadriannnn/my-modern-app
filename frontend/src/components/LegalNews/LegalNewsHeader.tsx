import React, { useRef } from 'react';
import { Link as RouterLink, NavLink, useNavigate } from 'react-router-dom';
import {
    Box, Container, Flex, Spacer, HStack, VStack, IconButton, Button,
    Menu, MenuButton, MenuList, MenuItem, MenuDivider, Avatar,
    useDisclosure,
    InputGroup, Input, InputRightElement,
    Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton,
    Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
    Link as ChakraLink, Text, Icon, Collapse, useTheme
} from '@chakra-ui/react';
import {
    FiMenu, FiSearch, FiX,
    FiSettings, FiLogOut, FiLogIn, FiUserPlus, FiChevronDown, FiFile, FiUserCheck,
    FiMoreVertical, FiBriefcase, FiCalendar, FiMessageSquare,
    FiUsers, FiAward, FiCpu, FiHome, FiBook,
    FiMail, FiPhone,
} from 'react-icons/fi';
import { FaHandshake } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useSectionTheme } from '../../context/SectionThemeContext';
import ThemeToggleButton from '../ThemeToggleButton';

const menuData = [
    { name: 'Homepage', path: '/stiri', icon: FiHome },
    { name: 'Articole', path: '/stiri/articole', icon: FiMessageSquare },
    { name: 'Profesioniști', path: '/profesionisti', icon: FiUsers },
    { name: 'Evenimente', path: '/evenimente', icon: FiCalendar },
    { name: 'Cariere', path: '/cariera', icon: FiBriefcase },
    { name: 'Editură', path: '/editura', icon: FiBook },
    { name: 'AI Juridic', path: 'https://app.verdictline.com/login', icon: FiAward, external: true },
];

const DesktopNavItem = ({ item }: { item: any }) => {
    const commonProps = {
        variant: "ghost", color: "white", _hover: { bg: 'whiteAlpha.100' },
        fontWeight: "medium", fontSize: "sm",
        leftIcon: item.icon ? <Icon as={item.icon} boxSize={4} /> : undefined,
        px: { base: 2, lg: 2, xl: 2.5 },
    };

    if (item.external) {
        return (
            <Button
                as={ChakraLink} href={item.path} isExternal
                {...commonProps}
            >
                {item.name}
            </Button>
        );
    } else {
        return (
            <Button
                as={NavLink} to={item.path}
                // end={item.path === '/stiri'}
                _activeLink={{ bg: 'whiteAlpha.200', fontWeight: 'semibold' }}
                {...commonProps}
            >
                {item.name}
            </Button>
        );
    }
};

const DesktopNavDropdown = ({ item }: { item: any }) => {
    const { colorMode } = useSectionTheme(); // Get basic theme info

    // Simplification: Using hardcoded colors or semantic tokens if available to ensure it works
    const bg = colorMode === 'light' ? "white" : "gray.800";
    const color = colorMode === 'light' ? "gray.800" : "white";
    const borderColor = colorMode === 'light' ? "gray.200" : "gray.700";
    const hoverBg = colorMode === 'light' ? "gray.100" : "gray.700";

    const menuListStyles = {
        bg: bg,
        color: color,
        border: "1px solid",
        borderColor: borderColor,
        boxShadow: "md", minW: "220px", zIndex: "dropdown"
    };
    const menuItemStyles = {
        fontSize: "sm",
        _hover: { bg: hoverBg },
        fontWeight: "normal"
    };

    return (
        <Menu placement="bottom-start">
            <MenuButton
                as={Button} variant="ghost" color="white"
                _hover={{ bg: 'whiteAlpha.100' }} _active={{ bg: 'whiteAlpha.200' }}
                fontWeight="medium" fontSize="sm"
                leftIcon={item.icon ? <Icon as={item.icon} boxSize={4} /> : undefined}
                rightIcon={<Icon as={FiChevronDown} boxSize={3} />}
                px={{ base: 2, lg: 2, xl: 2.5 }}
            >
                {item.name}
            </MenuButton>
            <MenuList {...menuListStyles}>
                {item.children.map((child: any) => (
                    <MenuItem
                        key={child.name}
                        as={child.external ? ChakraLink : RouterLink}
                        to={!child.external ? child.path || '#' : undefined}
                        href={child.external ? child.path : undefined}
                        {...(child.external && { isExternal: child.external })}
                        {...menuItemStyles}
                        {...(!child.external && { as: NavLink, to: child.path || '#', end: false })}
                    >
                        {child.name}
                    </MenuItem>
                ))}
            </MenuList>
        </Menu>
    );
};

const MobileMenuItem = ({ item, onClose }: { item: any, onClose: () => void }) => {
    const { themeName, colorMode } = useSectionTheme();
    // const commonLinkPropsBase = {
    //     display: "flex", alignItems: "center", w: "full", py: 3, px: 4,
    //     fontSize: "md", fontWeight: "medium", color: "gray.700",
    // };

    const hoverBg = colorMode === 'light' ? "gray.100" : "gray.700";
    const headerBg = colorMode === 'light' ? "gray.50" : "gray.800";
    const newsTextSecondary = "gray.500";

    if (item.children) {
        return (
            <AccordionItem border="none">
                <h2>
                    <AccordionButton py={3} px={4} _hover={{ bg: hoverBg }}>
                        <HStack flex='1' textAlign='left' spacing={3}>
                            {item.icon && <Icon as={item.icon} boxSize={5} color={newsTextSecondary} />}
                            <Text fontWeight="medium">{item.name}</Text>
                        </HStack>
                        <AccordionIcon />
                    </AccordionButton>
                </h2>
                <AccordionPanel pb={2} pt={1} bg={headerBg}>
                    <VStack align="stretch" spacing={0}>
                        {item.children.map((child: any) => (
                            <ChakraLink
                                key={child.name} display="block" py={2} px={4} pl={12} fontSize="sm"
                                _hover={{ bg: hoverBg }}
                                onClick={onClose}
                                as={child.external ? 'a' : NavLink}
                                href={child.external ? child.path : undefined}
                                to={!child.external ? child.path || '#' : undefined}
                                {...(child.external && { isExternal: child.external, target: "_blank", rel: "noopener noreferrer" })}
                            >
                                {child.name}
                            </ChakraLink>
                        ))}
                    </VStack>
                </AccordionPanel>
            </AccordionItem>
        );
    } else {
        return (
            <Box borderBottom="1px solid" borderColor="gray.100">
                <ChakraLink
                    display="flex" alignItems="center" w="full" py={3} px={4}
                    fontSize="md" fontWeight="medium"
                    // color="gray.700"
                    as={item.external ? 'a' : NavLink}
                    href={item.external ? item.path : undefined}
                    to={!item.external ? item.path : undefined}
                    {...(item.external && { isExternal: item.external, target: "_blank", rel: "noopener noreferrer" })}
                    onClick={onClose}
                    _hover={{ bg: 'gray.100' }}
                >
                    <HStack spacing={3}>
                        {item.icon && <Icon as={item.icon} boxSize={5} color={newsTextSecondary} />}
                        <Text>{item.name}</Text>
                    </HStack>
                </ChakraLink>
            </Box>
        );
    }
};

interface LegalNewsHeaderProps {
    searchNews: (term: string) => void;
    setSearchTerm: (term: string) => void;
    searchTerm: string;
}

const LegalNewsHeader: React.FC<LegalNewsHeaderProps> = ({ searchNews, setSearchTerm, searchTerm }) => {
    const { themeName, colorMode } = useSectionTheme();
    // const chakraFullTheme = useTheme();
    const { isOpen: isDrawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose } = useDisclosure();
    const { isOpen: isMobileSearchOpen, onToggle: onMobileSearchToggle } = useDisclosure();
    const btnRef = useRef<HTMLButtonElement>(null);
    const navigate = useNavigate();

    const { isAuthenticated, user, logout } = useAuth();

    // Simplified: Navigating to separate login/register pages instead of modals for now
    // to reduce complexity and dependency on missing compnents.
    const handleLogin = () => navigate('/login');
    const handleRegister = () => navigate('/register');


    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(event.target.value); };
    const handleSearchSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (searchTerm.trim().length >= 3) { searchNews(searchTerm.trim()); }
    };

    const handleMobileNavigateAndClose = (path: string) => {
        navigate(path);
        onDrawerClose();
    };

    const handleMobileActionAndClose = (actionFn: () => void) => {
        actionFn();
        onDrawerClose();
    }

    const numDirectLinksDesktop = 6;

    // Custom header background color (Dark Blue typically)
    const headerBg = "#0F172A"; // Example: Slate 900 or similar professional dark blue

    return (
        <>
            <Box
                as="header" position="sticky" top="0" zIndex={100}
                bg={headerBg}
                color="white"
                boxShadow="sm" w="full"
            >
                <Container maxW={{ base: "100%", md: "90%", lg: "1400px" }} px={{ base: 2, sm: 3, md: 4, lg: 6 }}>
                    <VStack spacing={0} display={{ base: 'none', lg: 'flex' }} w="100%">
                        <Flex w="100%" h={{ lg: "72px" }} alignItems="center" py={2} borderBottomWidth="1px" borderColor="whiteAlpha.200">
                            <Box flexShrink={0}>
                                <ChakraLink as={RouterLink} to="/stiri" _hover={{ textDecoration: 'none' }} color="white">
                                    <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold"> LegeaAplicata </Text>
                                </ChakraLink>
                            </Box>
                            <Spacer />
                            <HStack spacing={3} flexShrink={1} minWidth="0">
                                <Button
                                    as={RouterLink}
                                    to="#"
                                    colorScheme="blue"
                                    variant="solid"
                                    size="sm"
                                    leftIcon={<Icon as={FaHandshake} />}
                                    flexShrink={0}
                                >
                                    Program Avocați
                                </Button>
                                <Box flexShrink={1} maxW={{ lg: "320px", xl: "420px" }} w="100%">
                                    <form onSubmit={handleSearchSubmit}>
                                        <InputGroup size="sm">
                                            <Input
                                                type="search" placeholder="Caută știri, articole, jurisprudență..." value={searchTerm} onChange={handleSearchChange}
                                                bg="whiteAlpha.200"
                                                border="none"
                                                _placeholder={{ color: "whiteAlpha.700" }}
                                                color="white"
                                                _focus={{ bg: "whiteAlpha.300", outline: "none" }}
                                                size="sm"
                                                borderRadius="md"
                                            />
                                            <InputRightElement>
                                                <IconButton aria-label="Caută" icon={<FiSearch />} size="xs" type="submit" variant="ghost" color="whiteAlpha.700" _hover={{ color: 'white' }} />
                                            </InputRightElement>
                                        </InputGroup>
                                    </form>
                                </Box>
                            </HStack>
                            <Spacer />
                            <HStack spacing={{ base: 2, md: 3, lg: 2 }} flexShrink={0}>
                                <Box>
                                    {!isAuthenticated ? (
                                        <HStack spacing={{ md: 1, lg: 2 }}>
                                            <Button size="sm" onClick={handleLogin} leftIcon={<FiLogIn />} variant="ghost" color="white" _hover={{ bg: "whiteAlpha.200" }}>Login</Button>
                                            <Button size="sm" onClick={handleRegister} leftIcon={<FiUserPlus />} colorScheme="blue" >Register</Button>
                                        </HStack>
                                    ) : (
                                        <Menu placement="bottom-end">
                                            <MenuButton
                                                as={Button} size="sm" variant="ghost" color="white" _hover={{ bg: "whiteAlpha.200" }}
                                                px={{ base: 1, lg: 2 }} aria-label="Meniu utilizator"
                                            >
                                                <HStack spacing={{ base: 1, lg: 2 }}>
                                                    <Avatar size="xs" name={user?.numeComplet || user?.email} />
                                                    <Text fontSize="sm" display={{ base: 'none', lg: 'inline' }} color="white">
                                                        {user?.numeComplet ? user.numeComplet.split(' ')[0] : user?.email}
                                                    </Text>
                                                    <Icon as={FiChevronDown} />
                                                </HStack>
                                            </MenuButton>
                                            <MenuList bg="white" color="gray.800" zIndex="popover">
                                                <MenuItem icon={<Icon as={FiSettings} fontSize="md" />} as={RouterLink} to="/setari" fontSize="sm"> Setări Cont </MenuItem>
                                                <MenuDivider />
                                                <MenuItem icon={<Icon as={FiLogOut} fontSize="md" color="red.500" />} onClick={logout} color="red.500" fontSize="sm"> Deconectare </MenuItem>
                                            </MenuList>
                                        </Menu>
                                    )}
                                </Box>
                                {/* ThemeToggle not used in header directly or needs adaptation */}
                            </HStack>
                        </Flex>
                        <Flex w="100%" h={{ lg: "52px" }} alignItems="center" justifyContent="center" borderTopWidth="1px" borderColor="whiteAlpha.200">
                            <HStack
                                spacing={{ base: 1, lg: 2, xl: 3 }}
                                display={{ base: 'none', lg: 'flex' }}
                                flexShrink={1}
                                minWidth="0"
                            >
                                {menuData.slice(0, numDirectLinksDesktop).map(item =>
                                    // @ts-ignore
                                    item.children ? (<DesktopNavDropdown key={item.name} item={item} />)
                                        : (<DesktopNavItem key={item.name} item={item} />)
                                )}
                                {menuData.length > numDirectLinksDesktop && (
                                    <DesktopNavDropdown item={{ name: "Mai Mult", icon: FiMoreVertical, children: menuData.slice(numDirectLinksDesktop) }} />
                                )}
                            </HStack>
                        </Flex>
                    </VStack>
                    <Flex h={{ base: "60px" }} alignItems="center" display={{ base: 'flex', lg: 'none' }} w="100%">
                        <IconButton
                            aria-label="Meniu" icon={<FiMenu />} size="md" fontSize="xl" variant="ghost"
                            color="white" _hover={{ bg: 'whiteAlpha.100' }}
                            onClick={onDrawerOpen} ref={btnRef} mr={{ base: 1, sm: 2 }}
                        />
                        <ChakraLink as={RouterLink} to="/stiri" _hover={{ textDecoration: 'none' }} flexShrink={0}
                            mx={{ base: 'auto', lg: 0 }}
                            ml={{ base: 2, lg: 0 }}
                            color="white"
                        >
                            <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold"> LegeaAplicata </Text>
                        </ChakraLink>
                        <Spacer />
                        <IconButton
                            aria-label="Caută" icon={<FiSearch />} size="md" fontSize="lg" variant="ghost"
                            color="white" _hover={{ bg: 'whiteAlpha.100' }}
                            onClick={onMobileSearchToggle} mr={1}
                        />
                    </Flex>
                </Container>
                <Collapse in={isMobileSearchOpen} animateOpacity>
                    <Box bg="white" py={3} px={{ base: 2, sm: 3, md: 4 }} borderBottomWidth="1px" borderColor="gray.200">
                        <form onSubmit={handleSearchSubmit}>
                            <InputGroup size="md">
                                <Input
                                    type="search" placeholder="Caută știri, articole..." value={searchTerm} onChange={handleSearchChange}
                                    variant="outline"
                                    size="md"
                                    borderRadius="md"
                                    color="gray.800"
                                    pr="3rem"
                                />
                                <InputRightElement width="3rem">
                                    <IconButton aria-label="Închide căutare" icon={<FiX />} size="sm" variant="ghost" onClick={onMobileSearchToggle} />
                                </InputRightElement>
                            </InputGroup>
                        </form>
                    </Box>
                </Collapse>
                <Drawer isOpen={isDrawerOpen} placement='left' onClose={onDrawerClose} finalFocusRef={btnRef} size={{ base: "xs", sm: "sm" }}>
                    <DrawerOverlay />
                    <DrawerContent bg="white" color="gray.800">
                        <DrawerCloseButton _focus={{ boxShadow: "outline" }} />
                        <DrawerHeader borderBottomWidth='1px' borderColor="gray.200"> Meniu Principal </DrawerHeader>
                        <DrawerBody p={0} display="flex" flexDirection="column">
                            <Box flexGrow={1} overflowY="auto">
                                <Accordion allowToggle defaultIndex={[]}>
                                    {menuData.map(item => (
                                        <MobileMenuItem key={item.name} item={item} onClose={onDrawerClose} />
                                    ))}
                                </Accordion>
                            </Box>
                            <VStack
                                spacing={2} align="stretch" p={4}
                                borderTopWidth="1px" borderColor="gray.200"
                                flexShrink={0} bg="gray.50"
                            >
                                {!isAuthenticated ? (
                                    <>
                                        <Button
                                            leftIcon={<FiLogIn />}
                                            variant="outline"
                                            justifyContent='flex-start'
                                            onClick={() => handleMobileActionAndClose(handleLogin)}
                                            size="md"
                                        > Login </Button>
                                        <Button
                                            leftIcon={<FiUserPlus />}
                                            colorScheme="blue"
                                            justifyContent='flex-start'
                                            onClick={() => handleMobileActionAndClose(handleRegister)}
                                            size="md"
                                        > Register </Button>
                                    </>
                                ) : (
                                    <Button
                                        leftIcon={<FiLogOut />}
                                        colorScheme="red" variant="ghost"
                                        justifyContent='flex-start'
                                        onClick={() => handleMobileActionAndClose(logout)}
                                        size="md"
                                    > Deconectare </Button>
                                )}
                            </VStack>
                        </DrawerBody>
                    </DrawerContent>
                </Drawer>
            </Box>
        </>
    );
};

export default LegalNewsHeader;
