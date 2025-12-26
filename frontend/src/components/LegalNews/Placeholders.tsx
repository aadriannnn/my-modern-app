import React from 'react';
import { Box, Heading, Text, Input, InputGroup, InputRightElement, Button, Icon, VStack } from '@chakra-ui/react';
import { FiSearch } from 'react-icons/fi';

export const LegislativeSearch = () => (
    <Box p={4} bg="gray.50" borderRadius="md" borderWidth="1px" borderColor="gray.200">
        <VStack align="stretch" spacing={3}>
            <Heading as="h3" size="sm" color="gray.700">Căutare în legislație</Heading>
            <Text fontSize="xs" color="gray.500">Selecteaza codul legislativ</Text>
            <Input placeholder="Caută în toate codurile" size="sm" bg="white" />
            <Text fontSize="xs" color="gray.500">Termen cautare</Text>
            <InputGroup size="sm">
                <Input placeholder="Introduceti termenul de cautare" bg="white" />
            </InputGroup>
            <Button size="sm" colorScheme="blue" variant="solid" width="full">Cauta</Button>
        </VStack>
    </Box>
);

export const JurisprudenceSearch = () => (
    <Box p={4} bg="gray.50" borderRadius="md" borderWidth="1px" borderColor="gray.200">
        <VStack align="stretch" spacing={3}>
            <Heading as="h3" size="sm" color="gray.700">Cautare in jurisprudenta</Heading>
            <Text fontSize="xs" color="gray.500">Materie</Text>
            <Input placeholder="Toate" size="sm" bg="white" />
            <Text fontSize="xs" color="gray.500">Obiect</Text>
            <Input placeholder="Toate" size="sm" bg="white" />
            <Button size="sm" colorScheme="blue" variant="solid" width="full">Cauta</Button>
        </VStack>
    </Box>
);

export const AdBanner = ({ imageUrl, linkUrl, altText }: { imageUrl: string, linkUrl: string, altText: string }) => (
    <Box as="a" href={linkUrl} target="_blank" rel="noopener noreferrer" display="block" mb={4}>
        {/* Placeholder logic if image is missing */}
        <Box bg="gray.200" h="200px" display="flex" alignItems="center" justifyContent="center">
            <Text color="gray.500">{altText || "Reclamă"}</Text>
        </Box>
    </Box>
);

export const TaxaTimbruPromo = () => (
    <Box p={4} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.100">
        <Heading as="h4" size="sm" color="blue.700" mb={2}>Calculator Taxă Timbru</Heading>
        <Text fontSize="xs" color="blue.600" mb={3}>
            Estimează taxa judiciară de timbru datorată conform OUG 80/2013.
        </Text>
        <Button as="a" href="/taxa-timbru" size="sm" colorScheme="blue" variant="link">
            Accesează Calculatorul →
        </Button>
    </Box>
);

export const AdSenseAd = ({ fallback }: { fallback?: React.ReactNode }) => (
    <Box bg="gray.50" p={4} textAlign="center" borderRadius="md" borderWidth="1px" borderStyle="dashed">
        {fallback || <Text fontSize="xs" color="gray.400">Reclamă</Text>}
    </Box>
);
