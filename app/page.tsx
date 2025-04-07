'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Text,
  Button,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  Badge,
  IconButton,
  Tooltip,
  Flex,
  Spacer,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  useColorModeValue,
} from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiTrash2, FiFile, FiInfo, FiDatabase, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';

interface File {
  fileId: string;
  filename: string;
  invoicing: 'malaysia' | 'ksa';
  userbase: 'end_user' | 'dev';
  createdAt: string;
}

interface KB {
  creationId: string;
  createdDate: string;
  updatedDate: string;
  createdBy: string;
  updatedBy: string;
  createdUser: string;
  updatedUser: string;
  clientId: string;
  chunksize: number;
  chunkoverlap: number;
  indexName: string;
  isActive: boolean;
  totalDocuments: number;
  processedDocuments: number;
  status: string;
  isNewKB: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ai.complyance.io/api/v1/management';
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InNhbmpheUBjb21wbHlhbmNlLmlvIiwic3ViIjoiNjZiYzgzNTA1Y2FjMjAxMzVlZjMyNTc4IiwiX2lkIjoiNjZiYzgzNTA1Y2FjMjAxMzVlZjMyNTc4IiwiVXNlcklkIjoiZGNmNmEwMzMtY2IyNC00ZmY2LWE4NGYtOWY1NWQ1ZTc2YTI2IiwiSXNWZXJpZmllZCI6dHJ1ZSwiQ2xpZW50SWQiOiI2YzY2NjJhYi1iOGZjLTRjZGQtYWY1NC03ZGFjYjQ3MDM1ZDQiLCJzZXNzaW9uSWQiOiJiNDczMGNjOS0yOGE2LTQ0MDEtYmNhNC0wODE0NjRiNDk1ZDIiLCJleHAiOjE3NDQ1MzQyNjUsImlhdCI6MTc0MTE1MjM5MX0.8ssl0uG_ITfeNiBYuiIFIdFrHBuxQOdQhqjocRzc-ig";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedKB, setSelectedKB] = useState<KB | null>(null);
  const { isOpen: isFileModalOpen, onOpen: onFileModalOpen, onClose: onFileModalClose } = useDisclosure();
  const { isOpen: isKBModalOpen, onOpen: onKBModalOpen, onClose: onKBModalClose } = useDisclosure();
  const toast = useToast();
  const queryClient = useQueryClient();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Add this state for tracking upload progress
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Fetch files
  const { data: files, isLoading: isLoadingFiles } = useQuery<File[]>('files', async () => {
    const response = await axios.get(`${API_BASE_URL}/files`, {
      headers: { Authorization: token },
    });
    return response.data.data;
  });

  // Fetch KBs
  const { data: kbs, isLoading: isLoadingKBs } = useQuery<KB[]>('kbs', async () => {
    const response = await axios.get(`${API_BASE_URL}/kb/`, {
      headers: { Authorization: token },
    });
    return response.data.data;
  });

  // Update the upload mutation to handle multiple files
  const uploadMutation = useMutation(
    async (filesData: { data: string; filename: string; invoicing: string; userbase: string }[]) => {
      const uploadPromises = filesData.map(fileData => 
        axios.post(`${API_BASE_URL}/addfiles`, fileData, {
          headers: { Authorization: token, 'Content-Type': 'application/json' },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setUploadProgress(prev => ({
              ...prev,
              [fileData.filename]: progress
            }));
          }
        })
      );
      return Promise.all(uploadPromises);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('files');
        setUploadProgress({});
        toast({
          title: 'Files uploaded successfully',
          status: 'success',
          duration: 3000,
        });
      },
      onError: (error: any) => {
        setUploadProgress({});
        toast({
          title: 'Error uploading files',
          description: error.response?.data?.detail || 'Something went wrong',
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  // Delete file mutation
  const deleteMutation = useMutation(
    async (fileId: string) => {
      try {
        console.log('Attempting to delete file with ID:', fileId);
        const response = await axios.delete(`${API_BASE_URL}/files/${fileId}`, {
          headers: { 
            Authorization: token,
            'Content-Type': 'application/json'
          },
        });
        console.log('Delete response:', response.data);
        return response.data;
      } catch (error: any) {
        console.error('Delete API error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          fileId: fileId
        });
        throw error;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('files');
        toast({
          title: 'File deleted successfully',
          status: 'success',
          duration: 3000,
        });
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.detail || 
                           'Failed to delete file';
        
        console.error('Delete error details:', {
          status: error.response?.status,
          message: errorMessage,
          fileId: error.config?.url?.split('/').pop()
        });

        toast({
          title: 'Error deleting file',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      },
    }
  );

  // Create KB mutation
  const createKBMutation = useMutation(
    async (kbData: { chunksize?: number; chunkoverlap?: number; indexname?: string }) => {
      const response = await axios.post(`${API_BASE_URL}/kb/create`, kbData, {
        headers: { Authorization: token, 'Content-Type': 'application/json' },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('kbs');
        toast({
          title: 'Knowledge Base created successfully',
          status: 'success',
          duration: 3000,
        });
      },
      onError: (error: any) => {
        toast({
          title: 'Error creating Knowledge Base',
          description: error.response?.data?.detail || 'Something went wrong',
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  // Activate KB mutation
  const activateKBMutation = useMutation(
    async (creationId: string) => {
      const response = await axios.post(`${API_BASE_URL}/kb/${creationId}/activate`, {}, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('kbs');
        toast({
          title: 'Knowledge Base activated successfully',
          status: 'success',
          duration: 3000,
        });
      },
      onError: (error: any) => {
        toast({
          title: 'Error activating Knowledge Base',
          description: error.response?.data?.detail || 'Something went wrong',
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  // Update the dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      const uploadPromises = acceptedFiles.map(file => {
        return new Promise<{ data: string; filename: string; invoicing: string; userbase: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = async () => {
            const base64Data = reader.result as string;
            const base64Content = base64Data.split(',')[1];
            resolve({
              data: base64Content,
              filename: file.name,
              invoicing: 'malaysia',
              userbase: 'end_user'
            });
          };
          reader.readAsDataURL(file);
        });
      });

      const filesData = await Promise.all(uploadPromises);
      uploadMutation.mutate(filesData);
    },
    multiple: true
  });

  const handleDelete = async (fileId: string) => {
    try {
      if (!fileId) {
        toast({
          title: 'Error',
          description: 'Invalid file ID',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      if (window.confirm('Are you sure you want to delete this file?')) {
        await deleteMutation.mutateAsync(fileId);
      }
    } catch (error) {
      console.error('Delete handler error:', error);
    }
  };

  const handleViewDetails = (file: File) => {
    setSelectedFile(file);
    onFileModalOpen();
  };

  const handleCreateKB = () => {
    createKBMutation.mutate({
      chunksize: 1000,
      chunkoverlap: 200,
      indexname: `kb_${new Date().getTime()}`
    });
  };

  const handleActivateKB = (creationId: string) => {
    if (window.confirm('Are you sure you want to activate this Knowledge Base?')) {
      activateKBMutation.mutate(creationId);
    }
  };

  const handleViewKBDetails = (kb: KB) => {
    setSelectedKB(kb);
    onKBModalOpen();
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Flex align="center" justify="space-between">
          <Heading size="xl">File Manager</Heading>
          <Button
            leftIcon={<FiDatabase />}
            colorScheme="blue"
            onClick={handleCreateKB}
            isLoading={createKBMutation.isLoading}
          >
            Create New KB
          </Button>
        </Flex>

        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>Knowledge Bases</Tab>
            <Tab>Files</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              {isLoadingKBs ? (
                <Text>Loading Knowledge Bases...</Text>
              ) : kbs?.length === 0 ? (
                <Card>
                  <CardBody>
                    <Text>No Knowledge Bases created yet</Text>
                  </CardBody>
                </Card>
              ) : (
                <VStack spacing={4} align="stretch">
                  {kbs?.map((kb) => (
                    <Card key={kb.creationId} border="1px" borderColor={borderColor}>
                      <CardBody>
                        <VStack align="stretch" spacing={4}>
                          <Flex align="center">
                            <VStack align="start" spacing={0}>
                              <Heading size="md">{kb.indexName}</Heading>
                              <Text fontSize="sm" color="gray.500">
                                Created: {new Date(kb.createdDate).toLocaleDateString()}
                              </Text>
                            </VStack>
                            <Spacer />
                            <Badge colorScheme={kb.isActive ? "green" : "gray"}>
                              {kb.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </Flex>

                          <Divider />

                          <HStack spacing={4}>
                            <Stat>
                              <StatLabel>Documents</StatLabel>
                              <StatNumber>{kb.processedDocuments}/{kb.totalDocuments}</StatNumber>
                              <Progress
                                value={(kb.processedDocuments / kb.totalDocuments) * 100}
                                size="sm"
                                colorScheme="blue"
                                mt={2}
                              />
                            </Stat>
                            <Stat>
                              <StatLabel>Chunk Size</StatLabel>
                              <StatNumber>{kb.chunksize}</StatNumber>
                              <StatHelpText>Overlap: {kb.chunkoverlap}</StatHelpText>
                            </Stat>
                          </HStack>

                          <HStack justify="flex-end">
                            <Tooltip label="View Details">
                              <IconButton
                                aria-label="View details"
                                icon={<FiInfo />}
                                onClick={() => handleViewKBDetails(kb)}
                              />
                            </Tooltip>
                            {!kb.isActive && (
                              <Tooltip label="Activate KB">
                                <IconButton
                                  aria-label="Activate KB"
                                  icon={<FiCheckCircle />}
                                  colorScheme="green"
                                  onClick={() => handleActivateKB(kb.creationId)}
                                />
                              </Tooltip>
                            )}
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              )}
            </TabPanel>

            <TabPanel>
              <Card mb={4} border="1px" borderColor={borderColor}>
                <CardBody>
                  <Box
                    {...getRootProps()}
                    p={8}
                    border="2px dashed"
                    borderColor={isDragActive ? 'blue.500' : borderColor}
                    borderRadius="md"
                    textAlign="center"
                    cursor="pointer"
                    _hover={{ borderColor: 'blue.500' }}
                  >
                    <input {...getInputProps()} />
                    <FiUpload size={48} style={{ margin: '0 auto 1rem' }} />
                    <Text>
                      {isDragActive
                        ? 'Drop the files here'
                        : 'Drag and drop files here, or click to select'}
                    </Text>
                    <Text fontSize="sm" color="gray.500" mt={2}>
                      Multiple files supported
                    </Text>
                  </Box>
                  
                  {/* Upload Progress */}
                  {Object.keys(uploadProgress).length > 0 && (
                    <VStack mt={4} spacing={2}>
                      {Object.entries(uploadProgress).map(([filename, progress]) => (
                        <Box key={filename} w="100%">
                          <Flex justify="space-between" mb={1}>
                            <Text fontSize="sm" isTruncated maxW="70%">
                              {filename}
                            </Text>
                            <Text fontSize="sm">{progress}%</Text>
                          </Flex>
                          <Progress value={progress} size="sm" colorScheme="blue" />
                        </Box>
                      ))}
                    </VStack>
                  )}
                </CardBody>
              </Card>

              {isLoadingFiles ? (
                <Text>Loading files...</Text>
              ) : files?.length === 0 ? (
                <Card>
                  <CardBody>
                    <Text>No files uploaded yet</Text>
                  </CardBody>
                </Card>
              ) : (
                <VStack spacing={4} align="stretch">
                  {files?.map((file) => (
                    <Card key={file.fileId} border="1px" borderColor={borderColor}>
                      <CardBody>
                        <Flex align="center">
                          <HStack>
                            <FiFile />
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="bold">{file.filename}</Text>
                              <Text fontSize="sm" color="gray.500">
                                {new Date(file.createdAt).toLocaleDateString()}
                              </Text>
                            </VStack>
                          </HStack>
                          <Spacer />
                          <HStack>
                            <Tooltip label="View Details">
                              <IconButton
                                aria-label="View details"
                                icon={<FiInfo />}
                                onClick={() => handleViewDetails(file)}
                              />
                            </Tooltip>
                            <Tooltip label="Delete File">
                              <IconButton
                                aria-label="Delete file"
                                icon={<FiTrash2 />}
                                colorScheme="red"
                                onClick={() => handleDelete(file.fileId)}
                              />
                            </Tooltip>
                          </HStack>
                        </Flex>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* KB Details Modal */}
        <Modal isOpen={isKBModalOpen} onClose={onKBModalClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Knowledge Base Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              {selectedKB && (
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Creation ID</Text>
                    <Text>{selectedKB.creationId}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Status</Text>
                    <Badge colorScheme={selectedKB.status === 'active' ? 'green' : 'gray'}>
                      {selectedKB.status}
                    </Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Documents</Text>
                    <Text>{selectedKB.processedDocuments} / {selectedKB.totalDocuments}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Chunk Size</Text>
                    <Text>{selectedKB.chunksize}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Chunk Overlap</Text>
                    <Text>{selectedKB.chunkoverlap}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Index Name</Text>
                    <Text>{selectedKB.indexName}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Created By</Text>
                    <Text>{selectedKB.createdUser}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Created Date</Text>
                    <Text>{new Date(selectedKB.createdDate).toLocaleString()}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Active Status</Text>
                    <Badge colorScheme={selectedKB.isActive ? 'green' : 'gray'}>
                      {selectedKB.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </HStack>
                </VStack>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* File Details Modal */}
        <Modal isOpen={isFileModalOpen} onClose={onFileModalClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>File Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              {selectedFile && (
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Filename</Text>
                    <Text>{selectedFile.filename}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Invoicing</Text>
                    <Badge colorScheme="blue">{selectedFile.invoicing}</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Userbase</Text>
                    <Badge colorScheme="purple">{selectedFile.userbase}</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Uploaded</Text>
                    <Text>{new Date(selectedFile.createdAt).toLocaleString()}</Text>
                  </HStack>
                </VStack>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  );
} 