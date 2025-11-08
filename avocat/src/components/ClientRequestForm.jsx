import React, { useState, useCallback } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Container,
    FormControl,
    FormErrorMessage,
    FormHelperText,
    FormLabel,
    Heading,
    Input,
    Select,
    Textarea,
    VStack,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    useToast,
    Link,
    Text
} from '@chakra-ui/react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import apiClient from '../utils/apiClient'; // Assuming apiClient.js is in src/utils

const ClientRequestForm = () => {
    // Form field states
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [county, setCounty] = useState('');
    const [practiceArea, setPracticeArea] = useState('');
    const [description, setDescription] = useState('');
    const [gdprConsent, setGdprConsent] = useState(false);
    const [applicantType, setApplicantType] = useState(''); // e.g., 'persoana_fizica'
    const [isRepresented, setIsRepresented] = useState(false);

    // Submission states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState({ error: null, success: null });

    const { executeRecaptcha } = useGoogleReCaptcha();
    const toast = useToast();

    // TODO: Define options for select fields if applicable
    const applicantTypeOptions = [
        { value: 'persoana_fizica', label: 'Persoană Fizică' },
        { value: 'persoana_juridica', label: 'Persoană Juridică' },
        { value: 'autoritate_publica', label: 'Autoritate Publică' },
        { value: 'alta_entitate', label: 'Altă Entitate' },
    ];

    const practiceAreaOptions = [
        // These would ideally come from an API or a shared constants file
        { value: 'litigii_si_arbitraj', label: 'Litigii și Arbitraj' },
        { value: 'drept_comercial', label: 'Drept Comercial și Societar' },
        { value: 'drept_imobiliar', label: 'Drept Imobiliar și Construcții' },
        { value: 'dreptul_muncii', label: 'Dreptul Muncii' },
        { value: 'drept_fiscal', label: 'Drept Fiscal' },
        { value: 'proprietate_intelectuala', label: 'Proprietate Intelectuală' },
        { value: 'drept_penal_al_afacerilor', label: 'Drept Penal al Afacerilor' },
        { value: 'achizitii_publice', label: 'Achiziții Publice' },
        { value: 'protectia_datelor', label: 'Protecția Datelor (GDPR)' },
        { value: 'drept_administrativ', label: 'Drept Administrativ' },
        { value: 'altele', label: 'Altele (precizați în descriere)' },
    ];


    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setSubmitStatus({ error: null, success: null });

        if (!gdprConsent) {
            setSubmitStatus({ error: 'Este necesar să acceptați termenii GDPR pentru a trimite cererea.', success: null });
            toast({ title: "Eroare Validare", description: "Acceptarea termenilor GDPR este obligatorie.", status: "error", duration: 5000, isClosable: true });
            return;
        }

        if (!executeRecaptcha) {
            setSubmitStatus({ error: 'Serviciul reCAPTCHA nu este disponibil. Vă rugăm reîncărcați pagina.', success: null });
            toast({ title: "Eroare reCAPTCHA", description: "Serviciul reCAPTCHA nu este disponibil. Reîncărcați pagina.", status: "error", duration: 7000, isClosable: true });
            return;
        }

        setIsSubmitting(true);
        let recaptchaToken;
        try {
            recaptchaToken = await executeRecaptcha('client_request_submit');
            if (!recaptchaToken) {
                throw new Error("Nu s-a putut genera token-ul reCAPTCHA. Vă rugăm încercați din nou.");
            }
        } catch (error) {
            setSubmitStatus({ error: error.message || 'Eroare la verificarea reCAPTCHA.', success: null });
            toast({ title: "Eroare reCAPTCHA", description: error.message || 'Eroare la verificarea reCAPTCHA.', status: "error", duration: 7000, isClosable: true });
            setIsSubmitting(false);
            return;
        }

        const payload = {
            name,
            email,
            phone: phone || null, // Send null if empty, or handle optionality in backend
            county,
            practice_area: practiceArea,
            description,
            gdpr_consent: gdprConsent,
            applicant_type: applicantType,
            is_represented: isRepresented,
            gRecaptchaToken: recaptchaToken,
        };

        try {
            // apiClient will prepend the API_BASE_URL
            const response = await apiClient.post('/api/client-requests/', payload);

            setSubmitStatus({ success: response.data.message || 'Cererea dvs. a fost trimisă cu succes! Vă vom contacta în cel mai scurt timp.', error: null });
            toast({
                title: "Cerere Trimisă!",
                description: response.data.message || 'Cererea dvs. a fost trimisă cu succes!',
                status: "success",
                duration: 7000,
                isClosable: true,
            });

            // Reset form
            setName('');
            setEmail('');
            setPhone('');
            setCounty('');
            setPracticeArea('');
            setDescription('');
            setGdprConsent(false);
            setApplicantType('');
            setIsRepresented(false);

        } catch (error) {
            const errorMessage = error.response?.data?.detail || error.message || 'A apărut o eroare la trimiterea cererii. Vă rugăm încercați din nou.';
            setSubmitStatus({ error: errorMessage, success: null });
            toast({
                title: "Eroare Trimitere Cerere",
                description: errorMessage,
                status: "error",
                duration: 9000,
                isClosable: true,
            });
            // Log detailed error for developers
            if (error.response?.data?.detail && Array.isArray(error.response.data.detail)) {
                 console.error("Validation errors:", error.response.data.detail);
                 // Potentially format and display these specific errors too
            } else {
                 console.error("Submission error object:", error);
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [
        name, email, phone, county, practiceArea, description, gdprConsent, applicantType, isRepresented,
        executeRecaptcha, toast // apiClient is stable, not needed in deps
    ]);

    return (
        <Container maxW="container.md" py={{ base: 8, md: 12 }}>
            <Heading as="h1" size="xl" mb={8} textAlign="center" className="gradient-heading">
                Formular Solicitare Client Nou
            </Heading>

            <Box bg="var(--form-bg-color)" p={{ base: 6, md: 8 }} borderRadius="lg" boxShadow="xl">
                <form onSubmit={handleSubmit}>
                    <VStack spacing={5}>
                        <FormControl isRequired isInvalid={submitStatus.error && submitStatus.error.toLowerCase().includes('nume')}>
                            <FormLabel htmlFor="name">Nume și Prenume / Denumire Entitate</FormLabel>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Popescu Ion / Nume Companie SRL" />
                            {submitStatus.error && submitStatus.error.toLowerCase().includes('nume') && <FormErrorMessage>{submitStatus.error}</FormErrorMessage>}
                        </FormControl>

                        <FormControl isRequired isInvalid={submitStatus.error && submitStatus.error.toLowerCase().includes('email')}>
                            <FormLabel htmlFor="email">Adresă de Email</FormLabel>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemplu@domeniu.com" />
                            {submitStatus.error && submitStatus.error.toLowerCase().includes('email') && <FormErrorMessage>{submitStatus.error}</FormErrorMessage>}
                        </FormControl>

                        <FormControl isInvalid={submitStatus.error && submitStatus.error.toLowerCase().includes('telefon')}>
                            <FormLabel htmlFor="phone">Număr de Telefon (Opțional)</FormLabel>
                            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx" />
                            {submitStatus.error && submitStatus.error.toLowerCase().includes('telefon') && <FormErrorMessage>{submitStatus.error}</FormErrorMessage>}
                        </FormControl>

                        <FormControl isRequired isInvalid={submitStatus.error && submitStatus.error.toLowerCase().includes('județ')}>
                            <FormLabel htmlFor="county">Județ</FormLabel>
                            <Input id="county" value={county} onChange={(e) => setCounty(e.target.value)} placeholder="ex: București, Cluj, Iași" />
                            {/* Or use a Select if counties are predefined */}
                            {submitStatus.error && submitStatus.error.toLowerCase().includes('județ') && <FormErrorMessage>{submitStatus.error}</FormErrorMessage>}
                        </FormControl>

                        <FormControl isRequired isInvalid={submitStatus.error && submitStatus.error.toLowerCase().includes('tip solicitant')}>
                            <FormLabel htmlFor="applicantType">Tip Solicitant</FormLabel>
                            <Select
                                id="applicantType"
                                placeholder="Selectați tipul solicitantului"
                                value={applicantType}
                                onChange={(e) => setApplicantType(e.target.value)}
                            >
                                {applicantTypeOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </Select>
                            {submitStatus.error && submitStatus.error.toLowerCase().includes('tip solicitant') && <FormErrorMessage>{submitStatus.error}</FormErrorMessage>}
                        </FormControl>

                        <FormControl isRequired isInvalid={submitStatus.error && submitStatus.error.toLowerCase().includes('domeniu practică')}>
                            <FormLabel htmlFor="practiceArea">Domeniul de Practică / Tipul Problemei</FormLabel>
                            <Select
                                id="practiceArea"
                                placeholder="Selectați domeniul principal"
                                value={practiceArea}
                                onChange={(e) => setPracticeArea(e.target.value)}
                            >
                                {practiceAreaOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </Select>
                             {submitStatus.error && submitStatus.error.toLowerCase().includes('domeniu practică') && <FormErrorMessage>{submitStatus.error}</FormErrorMessage>}
                        </FormControl>

                        <FormControl isRequired isInvalid={submitStatus.error && submitStatus.error.toLowerCase().includes('descriere')}>
                            <FormLabel htmlFor="description">Descrierea Situației / Solicitării</FormLabel>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Vă rugăm descrieți pe scurt situația dvs. și ce servicii juridice căutați."
                                rows={6}
                            />
                            {submitStatus.error && submitStatus.error.toLowerCase().includes('descriere') && <FormErrorMessage>{submitStatus.error}</FormErrorMessage>}
                        </FormControl>

                        <FormControl>
                            <FormLabel htmlFor="isRepresented">Sunteți reprezentat(ă) în prezent de un alt avocat pentru această problemă?</FormLabel>
                             <Checkbox
                                id="isRepresented"
                                isChecked={isRepresented}
                                onChange={(e) => setIsRepresented(e.target.checked)}
                                colorScheme="blue"
                            >
                                Da, sunt reprezentat(ă) de un alt avocat.
                            </Checkbox>
                            <FormHelperText>Bifați dacă sunteți deja reprezentat de un alt cabinet de avocatură pentru speța descrisă.</FormHelperText>
                        </FormControl>

                        <FormControl isRequired isInvalid={submitStatus.error && submitStatus.error.includes('GDPR')}>
                            <Checkbox
                                id="gdprConsent"
                                isChecked={gdprConsent}
                                onChange={(e) => setGdprConsent(e.target.checked)}
                                colorScheme="blue"
                            >
                                Sunt de acord cu prelucrarea datelor mele personale conform Politicii de Confidențialitate.
                            </Checkbox>
                            <FormHelperText>
                                Pentru a trimite cererea, este necesar să fiți de acord cu <Link href="/privacy-policy" isExternal color="blue.500">Politica de Confidențialitate</Link>.
                            </FormHelperText>
                            {submitStatus.error && submitStatus.error.includes('GDPR') && <FormErrorMessage>{submitStatus.error}</FormErrorMessage>}
                        </FormControl>

                        {submitStatus.error && !submitStatus.error.includes('GDPR') && !submitStatus.error.toLowerCase().includes('nume') && !submitStatus.error.toLowerCase().includes('email') /* ... etc. for other specific fields */ && (
                            <Alert status="error" variant="subtle" borderRadius="md">
                                <AlertIcon />
                                <Box>
                                    <AlertTitle>Eroare Trimitere</AlertTitle>
                                    <AlertDescription>{submitStatus.error}</AlertDescription>
                                </Box>
                            </Alert>
                        )}

                        {submitStatus.success && (
                            <Alert status="success" variant="subtle" borderRadius="md">
                                <AlertIcon />
                                <Box>
                                    <AlertTitle>Cerere Trimisă!</AlertTitle>
                                    <AlertDescription>{submitStatus.success}</AlertDescription>
                                </Box>
                            </Alert>
                        )}

                        <Text fontSize="xs" color="gray.500" mt={3} textAlign="center">
                            Acest site este protejat de reCAPTCHA și se aplică{' '}
                            <Link href="https://policies.google.com/privacy" isExternal color="blue.500" _hover={{ textDecoration: 'underline' }}>
                                Politica de confidențialitate
                            </Link>{' '}
                            și{' '}
                            <Link href="https://policies.google.com/terms" isExternal color="blue.500" _hover={{ textDecoration: 'underline' }}>
                                Termenii și condițiile
                            </Link>{' '}
                            Google.
                        </Text>

                        <Button
                            type="submit"
                            colorScheme="blue"
                            isLoading={isSubmitting}
                            loadingText="Se trimite..."
                            width="full"
                            size="lg"
                            mt={4}
                            className="pagination-button" // Consistent styling with other buttons
                        >
                            Trimite Cererea
                        </Button>
                    </VStack>
                </form>
            </Box>
        </Container>
    );
};

export default ClientRequestForm;
