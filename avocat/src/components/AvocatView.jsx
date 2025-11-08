import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Flex,
    Heading,
    Text,
    VStack,
    // HStack, // Removed as unused
    FormControl,
    FormLabel,
    FormErrorMessage,
    FormHelperText,
    Input,
    // RadioGroup, // Removed
    // Radio, // Removed
    // CheckboxGroup, // Removed
    Checkbox, // Kept for GDPR
    Select, // Added
    Textarea,
    Button,
    Spinner,
    useToast,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    Link,
    Stack,
    Icon,
    Divider // Am păstrat Divider din codul tău anterior, deși nu era în importurile inițiale
} from '@chakra-ui/react';
import { FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { submitClientRequest } from '../utils/apiClient'; // Path corrected

const API_HOST = process.env.REACT_APP_API_HOST || window.location.hostname;
const API_PORT = process.env.REACT_APP_API_PORT || 8000;
const API_BASE_URL = `http://${API_HOST}:${API_PORT}`; // This is for the exit intent popup, keep it.

// <<< Modificare: Adăugăm onNavigate ca prop >>>
const AvocatView = ({ onNavigate }) => {
    // <<< Sfârșit Modificare >>>

    const romanianCounties = [
      "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brașov", "Brăila",
      "București", "Buzău", "Caraș-Severin", "Călărași", "Cluj", "Constanța", "Covasna",
      "Dâmbovița", "Dolj", "Galați", "Giurgiu", "Gorj", "Harghita", "Hunedoara", "Ialomița",
      "Iași", "Ilfov", "Maramureș", "Mehedinți", "Mureș", "Neamț", "Olt", "Prahova",
      "Satu Mare", "Sălaj", "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea", "Vaslui",
      "Vâlcea", "Vrancea"
    ];

    const practiceAreasOptions = [
      "Drept Civil", "Drept Penal", "Drept Comercial", "Dreptul Familiei", "Dreptul Muncii",
      "Drept Administrativ", "Drept Fiscal", "Dreptul Proprietatii Intelectuale",
      "Insolventa", "Real Estate", "Drept Bancar"
    ];

    const toast = useToast();
    const { isOpen: isExitIntentModalOpen, onOpen: onExitIntentModalOpen, onClose: onExitIntentModalClose } = useDisclosure();
    const exitIntentTriggered = useRef(false);
    const formSubmittedSuccessfully = useRef(false);

    const [formData, setFormData] = useState({
        nume: '',
        email: '',
        telefon: '', // Optional
        county: '', // New: for selected county
        practiceArea: '', // New: for selected practice area
        descriere: '',
        gdpr: false,
        este_persoana_fizica: false, // New field
        este_reprezentat_deja: false, // New field
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);

    const [telefonPopup, setTelefonPopup] = useState('');
    const [isSubmittingPopup, setIsSubmittingPopup] = useState(false);
    const [popupError, setPopupError] = useState('');
    const [popupSuccess, setPopupSuccess] = useState('');

    // Functiile handler rămân identice cu codul furnizat de tine
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // handleRadioChange and handleCheckboxChange removed as per instructions

    const handleGdprChange = (e) => {
        setFormData(prev => ({ ...prev, gdpr: e.target.checked }));
        if (errors.gdpr) {
            setErrors(prev => ({ ...prev, gdpr: null }));
        }
    };

    const handleEstePersoanaFizicaChange = (e) => {
        setFormData(prev => ({ ...prev, este_persoana_fizica: e.target.checked }));
        if (errors.este_persoana_fizica) {
            setErrors(prev => ({ ...prev, este_persoana_fizica: null }));
        }
    };

    const handleEsteReprezentatDeJaChange = (e) => {
        setFormData(prev => ({ ...prev, este_reprezentat_deja: e.target.checked }));
        // No error handling needed for this field as per plan
    };

     const validateForm = () => {
        const newErrors = {};
        if (!formData.nume.trim()) newErrors.nume = 'Numele și prenumele sunt obligatorii.';
        if (!formData.email.trim()) {
            newErrors.email = 'Adresa de email este obligatorie.';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Adresa de email nu este validă.';
        }
        // New validation for este_persoana_fizica
        if (!formData.este_persoana_fizica) {
            newErrors.este_persoana_fizica = 'Confirmarea că sunteți persoană fizică este obligatorie.';
        }
        // Removed validation for tipClient, serviciiSelectate, reprezentare
        if (!formData.county) newErrors.county = 'Județul este obligatoriu.';
        if (!formData.practiceArea) newErrors.practiceArea = 'Aria de practică este obligatorie.';
        // Keep localitate validation for now, will change field to county
        // if (!formData.localitate.trim()) newErrors.localitate = 'Localitatea este obligatorie.';
        if (!formData.descriere.trim()) {
            newErrors.descriere = 'Descrierea situației este obligatorie.';
        } else if (formData.descriere.trim().length < 100) {
            newErrors.descriere = 'Descrierea trebuie să aibă minim 100 de caractere.';
        }
        if (!formData.gdpr) {
            newErrors.gdpr = 'Trebuie să acceptați termenii și condițiile.';
        }
        return newErrors;
    };

    // handleSubmit este identic cu cel furnizat de tine
   const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitStatus(null);
        const formErrors = validateForm();

        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            toast({
                title: 'Eroare de validare',
                description: 'Vă rugăm să corectați câmpurile marcate.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
             try {
                 const firstErrorKey = Object.keys(formErrors)[0];
                 if (firstErrorKey) {
                     const errorElement = document.getElementsByName(firstErrorKey)[0];
                     if (errorElement) {
                         errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                         setTimeout(() => errorElement.focus({ preventScroll: true }), 300);
                     }
                 }
             } catch (focusError) {
                 console.error("Error during focus logic:", focusError);
             }
            return;
        }

        setIsSubmitting(true);
        formSubmittedSuccessfully.current = false;
        try {
            const payload = {
                name: formData.nume, // Changed from 'nume'
                email: formData.email,
                phone: formData.telefon || null, // Changed from 'telefon'
                county: formData.county, // Changed from 'localitate'
                practice_area: formData.practiceArea, // Changed from 'serviciiSelectate: [formData.practiceArea]'
                description: formData.descriere, // Changed from 'descriere'
                gdpr_consent: formData.gdpr, // Changed from 'gdpr'
                // Checkbox label is "Sunt persoană juridică" for formData.este_persoana_fizica
                // This means if it's checked, they are a juridical person.
                // applicant_type should be "Persoana Juridica" or "Persoana Fizica"
                applicant_type: formData.este_persoana_fizica ? "Persoana Juridica" : "Persoana Fizica",
                is_represented: formData.este_reprezentat_deja
            };
            // DEV_NOTE: Ensure submitClientRequest in apiClient.js POSTs to the correct endpoint for this form's data.
            // This form is now structured to submit to an endpoint expecting ClientRequestCreate schema (e.g., /api/lawyers/program/client-request).
            console.log('Submitting client request with payload:', payload);
            await submitClientRequest(payload);

            formSubmittedSuccessfully.current = true;
            setSubmitStatus('success');
            toast({
                title: 'Solicitare Trimisă',
                description: 'Solicitarea dvs. a fost trimisă cu succes. Veți fi contactat în curând.',
                status: 'success',
                duration: 9000,
                isClosable: true,
            });
            setFormData({
                nume: '',
                email: '',
                telefon: '',
                county: '',
                practiceArea: '',
                descriere: '',
                gdpr: false,
                este_persoana_fizica: false,
                este_reprezentat_deja: false,
            });
            setErrors({});
        } catch (error) {
            setSubmitStatus('error');
            let errorMessageString = 'A apărut o eroare la trimiterea solicitării.'; // Default message

            // Check if the error object has a response and data (common with Axios errors from apiClient)
            const errorDetail = error.response?.data?.detail || error.detail;

            if (errorDetail) {
              if (typeof errorDetail === 'object') {
                if (Array.isArray(errorDetail) && errorDetail.length > 0) {
                  // Handle Pydantic validation errors which are arrays of objects
                  // Example: [{"loc": ["body", "field_name"], "msg": "Error message", "type": "..."}]
                  errorMessageString = errorDetail.map(d => {
                    const field = d.loc && d.loc.length > 1 ? d.loc[d.loc.length -1] : 'Eroare'; // Get the actual field name
                    return `${field}: ${d.msg}`;
                  }).join('; ');
                } else if (errorDetail.message) {
                  // If the object has a 'message' property
                  errorMessageString = errorDetail.message;
                } else {
                  // Fallback for other kinds of objects
                  errorMessageString = JSON.stringify(errorDetail);
                }
              } else {
                // If errorDetail is already a string
                errorMessageString = errorDetail;
              }
            } else if (error.message) {
              errorMessageString = error.message;
            }

            // Ensure the toast description receives the processed string
            toast({
                title: 'Eroare Trimitere',
                description: errorMessageString,
                status: 'error',
                duration: 9000,
                isClosable: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // handleMouseOut este identic
    const handleMouseOut = useCallback((e) => {
        if (e.clientY <= 0 && !exitIntentTriggered.current && !formSubmittedSuccessfully.current && !isExitIntentModalOpen) {
            exitIntentTriggered.current = true;
            onExitIntentModalOpen();
        }
    }, [onExitIntentModalOpen, isExitIntentModalOpen]);

    // useEffect pentru mouseout este identic
    useEffect(() => {
        document.addEventListener('mouseout', handleMouseOut);
        return () => {
            document.removeEventListener('mouseout', handleMouseOut);
        };
    }, [handleMouseOut]);

    // handlePopupSubmit este identic
    const handlePopupSubmit = async () => {
        setPopupError('');
        setPopupSuccess('');
        const phoneRegex = /^\+?[\d\s]+$/;
        const normalizedPhone = telefonPopup.replace(/\s+/g, '');
        if (!normalizedPhone || !phoneRegex.test(normalizedPhone)) {
            setPopupError('Introduceți un număr de telefon valid.');
            return;
        }
        setIsSubmittingPopup(true);
        const popupData = {
            telefonSolicitant: normalizedPhone,
            numeSolicitant: formData.nume || 'Nespecificat',
            mesaj: 'Solicitare contact telefonic via exit pop-up'
        };
        try {
            const response = await fetch(`${API_BASE_URL}/api/solicitare-telefonica`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(popupData),
            });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 throw new Error(errorData?.detail || `Eroare ${response.status}`);
            }
            setPopupSuccess('Solicitarea a fost trimisă. Veți fi contactat telefonic.');
            setTelefonPopup('');
             setTimeout(() => {
                 if (isExitIntentModalOpen) {
                     onExitIntentModalClose();
                     setPopupSuccess('');
                 }
             }, 3000);
        } catch (error) {
             console.error("Eroare la trimiterea solicitării telefonice:", error);
             setPopupError(error.message || 'A apărut o eroare la trimitere. Vă rugăm încercați din nou.');
        } finally {
            setIsSubmittingPopup(false);
        }
    };

    // handlePopupCancel este identic
    const handlePopupCancel = () => {
        setPopupError('');
        setPopupSuccess('');
        setTelefonPopup('');
        onExitIntentModalClose();
    }

    // serviciiOptions removed as per instructions

    // JSX rămâne identic, cu excepția Link-ului GDPR
    return (
        <Box
            className="avocat-view-container"
            maxW="container.lg"
            mx="auto"
            px={{ base: 2, md: 4 }}
            py={{ base: 4, md: 8 }}
        >
            <Heading as="h2" size="lg" mb={4} textAlign="center" className="gradient-heading">
                 Solicitați Asistență Juridică
            </Heading>
            <Text mb={8} textAlign="center" color="var(--subtle-text)" fontSize="sm">
                Completați formularul de mai jos pentru a ne oferi detalii despre situația dvs. Un avocat vă va contacta în cel mai scurt timp posibil.
            </Text>

             <Box
                bg="var(--table-container-bg)"
                p={{ base: 4, md: 8 }}
                borderRadius="xl"
                boxShadow="lg"
                as="form"
                onSubmit={handleSubmit}
                 noValidate
            >
                <VStack spacing={6} align="stretch">

                    <Stack direction={{ base: 'column', md: 'row' }} spacing={6}>
                        <FormControl isRequired isInvalid={!!errors.nume}>
                             <FormLabel fontSize="sm" fontWeight="semibold" color="var(--label-color)">Nume și Prenume</FormLabel>
                            <Input
                                name="nume"
                                value={formData.nume}
                                onChange={handleInputChange}
                                placeholder="Ex: Popescu Ion"
                                bg="var(--input-bg)"
                                borderColor="var(--border-color)"
                                color="var(--text-color)"
                                borderRadius="md"
                                _focus={{ borderColor: "var(--gradient-start)", boxShadow: `0 0 0 1px var(--gradient-start)` }}
                            />
                            <FormErrorMessage color="var(--error-text-color)" fontSize="xs">{errors.nume}</FormErrorMessage>
                        </FormControl>

                        <FormControl isRequired isInvalid={!!errors.email}>
                            <FormLabel fontSize="sm" fontWeight="semibold" color="var(--label-color)">Adresă de Email</FormLabel>
                            <Input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Ex: email@domeniu.ro"
                                bg="var(--input-bg)"
                                borderColor="var(--border-color)"
                                color="var(--text-color)"
                                borderRadius="md"
                                _focus={{ borderColor: "var(--gradient-start)", boxShadow: `0 0 0 1px var(--gradient-start)` }}
                            />
                             <FormErrorMessage color="var(--error-text-color)" fontSize="xs">{errors.email}</FormErrorMessage>
                        </FormControl>

                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="semibold" color="var(--label-color)">Număr de Telefon</FormLabel>
                             <Input
                                name="telefon"
                                type="tel"
                                value={formData.telefon}
                                onChange={handleInputChange}
                                placeholder="Ex: 07xxxxxxxx"
                                bg="var(--input-bg)"
                                borderColor="var(--border-color)"
                                color="var(--text-color)"
                                borderRadius="md"
                                _focus={{ borderColor: "var(--gradient-start)", boxShadow: `0 0 0 1px var(--gradient-start)` }}
                            />
                        </FormControl>
                    </Stack>

                    <Divider borderColor="var(--border-color)" />

                    <FormControl isRequired isInvalid={!!errors.este_persoana_fizica} mt={6}>
                        <Checkbox
                            id="este_persoana_fizica-checkbox"
                            name="este_persoana_fizica"
                            isChecked={formData.este_persoana_fizica}
                            onChange={handleEstePersoanaFizicaChange}
                            className="custom-checkbox"
                            alignItems="flex-start"
                        >
                            <Box display="inline" ml={2}>
                                <Text display="inline" fontSize="sm" color="var(--text-color)">
                                    Sunt persoană juridică.
                                </Text>
                            </Box>
                        </Checkbox>
                        <FormErrorMessage color="var(--error-text-color)" fontSize="xs">{errors.este_persoana_fizica}</FormErrorMessage>
                    </FormControl>

                    <FormControl mt={6}>
                        <Checkbox
                            id="este_reprezentat_deja-checkbox"
                            name="este_reprezentat_deja"
                            isChecked={formData.este_reprezentat_deja}
                            onChange={handleEsteReprezentatDeJaChange}
                            className="custom-checkbox"
                            alignItems="flex-start"
                        >
                            <Box display="inline" ml={2}>
                                <Text display="inline" fontSize="sm" color="var(--text-color)">
                                    Sunt deja reprezentat(ă) de un avocat pentru această speță.
                                </Text>
                            </Box>
                        </Checkbox>
                    </FormControl>

                    <Divider borderColor="var(--border-color)" mt={6} />

                    {/* Removed Tip Client, Reprezentare, Servicii Selectate */}
                    {/* <Divider borderColor="var(--border-color)" /> */}

                    <FormControl isRequired isInvalid={!!errors.county}>
                        <FormLabel fontSize="sm" fontWeight="semibold" color="var(--label-color)">Județ</FormLabel>
                        <Select
                            name="county"
                            value={formData.county}
                            onChange={handleInputChange}
                            placeholder="-- Selectați județul --"
                            bg="var(--input-bg)"
                            borderColor="var(--border-color)"
                            color="var(--text-color)"
                            borderRadius="md"
                            _focus={{ borderColor: "var(--gradient-start)", boxShadow: `0 0 0 1px var(--gradient-start)` }}
                        >
                            {romanianCounties.map(judet => (
                                <option key={judet} value={judet}>{judet}</option>
                            ))}
                        </Select>
                        <FormHelperText color="var(--subtle-text)" fontSize="xs">
                            <Icon as={FiInfo} mr={1} verticalAlign="middle" color="var(--subtle-text)"/>
                            Selectați județul relevant pentru cazul dvs.
                        </FormHelperText>
                        <FormErrorMessage color="var(--error-text-color)" fontSize="xs">{errors.county}</FormErrorMessage>
                    </FormControl>

                    <Divider borderColor="var(--border-color)" />

                    <FormControl isRequired isInvalid={!!errors.practiceArea}>
                        <FormLabel fontSize="sm" fontWeight="semibold" color="var(--label-color)">Aria de practică</FormLabel>
                        <Select
                            name="practiceArea"
                            value={formData.practiceArea}
                            onChange={handleInputChange}
                            placeholder="-- Selectați aria de practică --"
                            bg="var(--input-bg)"
                            borderColor="var(--border-color)"
                            color="var(--text-color)"
                            borderRadius="md"
                            _focus={{ borderColor: "var(--gradient-start)", boxShadow: `0 0 0 1px var(--gradient-start)` }}
                        >
                            {practiceAreasOptions.map(area => (
                                <option key={area} value={area}>{area}</option>
                            ))}
                        </Select>
                        <FormErrorMessage color="var(--error-text-color)" fontSize="xs">{errors.practiceArea}</FormErrorMessage>
                    </FormControl>

                    <Divider borderColor="var(--border-color)" />

                    <FormControl isRequired isInvalid={!!errors.descriere}>
                        <FormLabel fontSize="sm" fontWeight="semibold" color="var(--label-color)">Descrieți situația dvs. cât mai în detaliu</FormLabel>
                        <Textarea
                            name="descriere"
                            value={formData.descriere}
                            onChange={handleInputChange}
                            placeholder="Scrieți aici detaliile cazului dvs..."
                            rows={6}
                            bg="var(--input-bg)"
                            borderColor="var(--border-color)"
                            color="var(--text-color)"
                            borderRadius="md"
                            _focus={{ borderColor: "var(--gradient-start)", boxShadow: `0 0 0 1px var(--gradient-start)` }}
                        />
                         <FormHelperText color="var(--subtle-text)" fontSize="xs">
                             <Icon as={FiInfo} mr={1} verticalAlign="middle" color="var(--subtle-text)"/>
                             Oferiți cât mai multe detalii (minim 100 caractere) pentru a permite avocaților să înțeleagă contextul și să vă ofere o primă evaluare sau cotație corectă. Includeți aspecte relevante precum părțile implicate, obiectul disputei, stadiul actual (dacă există), etc.
                         </FormHelperText>
                        <FormErrorMessage color="var(--error-text-color)" fontSize="xs">{errors.descriere}</FormErrorMessage>
                         {formData.descriere && (
                            <Text fontSize="xs" color={formData.descriere.length < 100 ? 'red.500' : 'green.500'} mt={1}>
                                 {formData.descriere.length} caractere
                             </Text>
                         )}
                    </FormControl>

                    <Divider borderColor="var(--border-color)" />

                    <FormControl isRequired isInvalid={!!errors.gdpr}>
                         <FormLabel htmlFor="gdpr-checkbox" srOnly>Acord GDPR</FormLabel>
                        <Checkbox
                            id="gdpr-checkbox"
                            name="gdpr"
                            isChecked={formData.gdpr}
                            onChange={handleGdprChange}
                            className="custom-checkbox"
                            alignItems="flex-start"
                        >
                            <Box display="inline" ml={2}>
                                <Text display="inline" fontSize="sm" color="var(--text-color)">Sunt de acord cu </Text>
                                {/* <<< Modificare: Linkul apelează onNavigate >>> */}
                                <Link
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (onNavigate) { // Verificăm dacă onNavigate există
                                            onNavigate('gdprPolicy'); // Apelăm funcția primită ca prop
                                        } else {
                                            console.warn("Prop-ul 'onNavigate' nu a fost furnizat componentei AvocatView.");
                                            // Fallback: Afișăm un mesaj toast dacă onNavigate nu e disponibil
                                            toast({
                                                title: "Eroare Navigare",
                                                description: "Funcția de navigare nu este disponibilă în acest context.",
                                                status: "warning",
                                                duration: 3000,
                                                isClosable: true,
                                            });
                                        }
                                    }}
                                    textDecoration="underline"
                                    color="var(--footer-link-color)"
                                    _hover={{ color: "var(--footer-link-hover-color)" }}
                                    fontSize="sm"
                                    fontWeight="medium"
                                >
                                    Termeni şi condiţii / Politica cookie / Protecția datelor
                                </Link>
                                {/* <<< Sfârșit Modificare >>> */}
                                <Text display="inline" fontSize="sm" color="var(--text-color)">.</Text>
                            </Box>
                         </Checkbox>
                        <FormErrorMessage color="var(--error-text-color)" fontSize="xs">{errors.gdpr}</FormErrorMessage>
                    </FormControl>

                    <Divider borderColor="var(--border-color)" pt={4} />

                    <Flex justify="center" direction="column" align="center" mt={4}>
                        <Button
                            type="submit"
                            isLoading={isSubmitting}
                            loadingText="Se trimite..."
                            variant="solid"
                            bg="var(--gradient-start)"
                            color="white"
                            _hover={{ bg: "var(--gradient-mid)", boxShadow: "md" }}
                            _active={{ bg: "var(--gradient-end)", transform: "scale(0.98)" }}
                            size="lg"
                            px={10}
                            borderRadius="md"
                            boxShadow="base"
                            leftIcon={isSubmitting ? <Spinner size="sm" /> : undefined}
                            width="full"
                        >
                            Trimite Cererea
                        </Button>

                         {submitStatus === 'success' && !isSubmitting && (
                            <Flex align="center" mt={4} color="green.500">
                                <Icon as={FiCheckCircle} mr={2} />
                                <Text fontSize="sm">Solicitarea a fost trimisă cu succes!</Text>
                            </Flex>
                        )}
                        {submitStatus === 'error' && !isSubmitting && (
                            <Flex align="center" mt={4} color="red.500">
                                <Icon as={FiAlertCircle} mr={2} />
                                <Text fontSize="sm">Eroare la trimitere. Vă rugăm reîncercați.</Text>
                             </Flex>
                        )}
                    </Flex>
                </VStack>
             </Box>

             <Modal isOpen={isExitIntentModalOpen} onClose={handlePopupCancel} isCentered>
                <ModalOverlay bg="blackAlpha.600"/>
                <ModalContent bg="var(--input-bg)" color="var(--text-color)">
                    <ModalHeader borderBottomWidth="1px" borderColor="var(--border-color)" fontSize="md">Preferi sa plasezi cererea telefonic?</ModalHeader>
                     <ModalCloseButton _focus={{ boxShadow: "outline" }} />
                    <ModalBody pb={6} pt={4}>
                         {popupSuccess && (
                            <Flex align="center" mb={4} color="green.500">
                                 <Icon as={FiCheckCircle} mr={2} />
                                <Text fontSize="sm">{popupSuccess}</Text>
                            </Flex>
                         )}
                         <FormControl isInvalid={!!popupError}>
                             <FormLabel htmlFor='telefon-popup' fontSize="sm" color="var(--label-color)">Numărul tău de telefon</FormLabel>
                             <Input
                                id='telefon-popup'
                                type="tel"
                                placeholder="Introdu numarul tau de telefon…"
                                value={telefonPopup}
                                onChange={(e) => setTelefonPopup(e.target.value)}
                                isDisabled={isSubmittingPopup || !!popupSuccess}
                                bg="var(--input-bg)"
                                borderColor="var(--border-color)"
                                color="var(--text-color)"
                                borderRadius="md"
                                _focus={{ borderColor: "var(--gradient-start)", boxShadow: `0 0 0 1px var(--gradient-start)` }}
                            />
                             <FormHelperText color="var(--subtle-text)" fontSize="xs" mt={1}>
                                Te vom contacta pentru informatiile necesare.
                             </FormHelperText>
                            <FormErrorMessage color="var(--error-text-color)" fontSize="xs">{popupError}</FormErrorMessage>
                         </FormControl>
                    </ModalBody>
                    <ModalFooter borderTopWidth="1px" borderColor="var(--border-color)">
                        <Button
                            variant="solid"
                            bg="var(--gradient-start)"
                            color="white"
                            _hover={{ bg: "var(--gradient-mid)", boxShadow: "md" }}
                            _active={{ bg: "var(--gradient-end)", transform: "scale(0.98)" }}
                            size="sm"
                            borderRadius="md"
                            boxShadow="base"
                            mr={3}
                            onClick={handlePopupSubmit}
                            isLoading={isSubmittingPopup}
                            loadingText="Se trimite"
                            isDisabled={!!popupSuccess}
                            leftIcon={isSubmittingPopup ? <Spinner size="sm" /> : undefined}
                        >
                             Da, prefer telefonic
                        </Button>
                        <Button variant='ghost' size="sm" onClick={handlePopupCancel} isDisabled={isSubmittingPopup || !!popupSuccess} _focus={{ boxShadow: 'outline' }}>
                            Nu, anulează
                        </Button>
                    </ModalFooter>
                </ModalContent>
             </Modal>
        </Box>
    );
};

export default AvocatView;
