import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  QrCode, 
  Activity, 
  Syringe, 
  Stethoscope, 
  Baby, 
  Milk, 
  Utensils, 
  ChevronRight,
  Filter,
  ArrowLeft,
  Save,
  Trash2,
  Phone,
  MapPin,
  User,
  Calendar,
  Weight,
  Tag,
  Download,
  Video,
  Gavel,
  Package,
  Clock,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db, collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, handleFirestoreError, OperationType } from '../services/firebase';
import { Livestock, VaccinationRecord, MedicalRecord, BreedingRecord, ProductionRecord, NutritionRecord } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { QRCodeModal } from '../components/QRCodeModal';
import toast from 'react-hot-toast';

interface LivestockManagerProps {
  onSellAsProduct?: (animal: Livestock) => void;
  onSellAsAuction?: (animal: Livestock, isLive: boolean) => void;
}

const LivestockManager: React.FC<LivestockManagerProps> = ({ onSellAsProduct, onSellAsAuction }) => {
  const { livestock, products, user, vaccinationRecords, medicalRecords, breedingRecords, productionRecords, nutritionRecords, setConfirmModal } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<Livestock | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('All');
  const [activeTab, setActiveTab] = useState<'info' | 'health' | 'breeding' | 'production' | 'nutrition'>('info');

  // Combine new livestock with legacy livestock from products
  const legacyLivestock: Livestock[] = (Array.isArray(products) ? products : [])
    .filter(p => p.isLivestock)
    .map(p => ({
      id: p.id,
      vendorId: p.vendorId,
      tagNumber: p.tagNumber || p.id.substring(0, 6).toUpperCase(),
      name: p.name,
      species: p.category || 'Cow',
      breed: p.breed || 'Unknown',
      gender: (p.gender === 'male' || p.gender === 'female' ? p.gender : 'female'),
      birthDate: p.birthDate || '',
      weight: p.weight || 0,
      status: 'alive',
      image: p.image,
      ownerName: p.vendorName,
      ownerPhone: '',
      location: p.location,
      createdAt: p.createdAt,
      healthStatus: 'Healthy',
      vaccinationStatus: 'Not Vaccinated'
    }));

  const allLivestock = [...livestock, ...legacyLivestock];

  // Form states
  const [newAnimal, setNewAnimal] = useState({
    tagNumber: '',
    name: '',
    species: 'Cow',
    breed: '',
    gender: 'female' as 'male' | 'female',
    birthDate: '',
    weight: undefined as number | undefined,
    colorMarkings: '',
    healthStatus: 'Healthy' as 'Healthy' | 'Sick' | 'Injured',
    vaccinationStatus: 'Not Vaccinated' as 'Vaccinated' | 'Not Vaccinated',
    lastTreatmentDate: '',
    notes: '',
    pregnancyStatus: 'Not Pregnant' as 'Pregnant' | 'Not Pregnant',
    expectedDeliveryDate: '',
    ownerName: user?.name || '',
    ownerPhone: user?.contact || '',
    location: '',
    farmSection: '',
    image: `https://picsum.photos/seed/${Math.random()}/400/300`
  });

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '';
    const birth = new Date(birthDate);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    if (years > 0) return `${years} years ${months} months`;
    return `${months} months`;
  };

  // Generate automatic tag number when modal opens
  React.useEffect(() => {
    if (isAdding && user) {
      const vendorAnimals = (Array.isArray(allLivestock) ? allLivestock : []).filter(a => a.vendorId === user.id);
      const nextNumber = (vendorAnimals.length + 1).toString().padStart(3, '0');
      const shopName = user.shopName || user.name || 'Vendor';
      const generatedTag = `${shopName} TZ ${nextNumber}`;
      setNewAnimal(prev => ({ ...prev, tagNumber: generatedTag }));
    }
  }, [isAdding, user, allLivestock.length]);

  const handleAddAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const animalData = {
        ...newAnimal,
        age: calculateAge(newAnimal.birthDate),
        vendorId: user.id,
        status: 'alive',
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'kuku_livestock'), animalData);
      
      // Show QR Code for the new animal
      const savedAnimal = { id: docRef.id, ...animalData } as Livestock;
      setSelectedAnimal(savedAnimal);
      setIsAdding(false);
      
      setNewAnimal({
        tagNumber: '',
        name: '',
        species: 'Cow',
        breed: '',
        gender: 'female',
        birthDate: '',
        weight: undefined,
        colorMarkings: '',
        healthStatus: 'Healthy',
        vaccinationStatus: 'Not Vaccinated',
        lastTreatmentDate: '',
        notes: '',
        pregnancyStatus: 'Not Pregnant',
        expectedDeliveryDate: '',
        ownerName: user?.name || '',
        ownerPhone: user?.contact || '',
        location: '',
        farmSection: '',
        image: `https://picsum.photos/seed/${Math.random()}/400/300`
      });
      toast.success('Animal added successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'kuku_livestock');
      toast.error('Failed to add animal');
    }
  };

  const handleDeleteAnimal = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Futa Mnyama',
      message: 'Je, una uhakika unataka kufuta mnyama huyu? Hatua hii haiwezi kurudishwa.',
      onConfirm: async () => {
        try {
          // Check if it's a legacy livestock (in products)
          const isLegacy = products.some(p => p.id === id && p.isLivestock);
          const collectionName = isLegacy ? 'kuku_products' : 'kuku_livestock';
          
          await deleteDoc(doc(db, collectionName, id));
          setSelectedAnimal(null);
          toast.success('Mnyama amefutwa');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, id);
          toast.error('Imeshindwa kufuta mnyama');
        }
      }
    });
  };

  const filteredLivestock = (Array.isArray(allLivestock) ? allLivestock : []).filter(animal => {
    const matchesSearch = 
      (animal.tagNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (animal.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesSpecies = filterSpecies === 'All' || animal.species === filterSpecies;
    return matchesSearch && matchesSpecies && animal.vendorId === user?.id;
  });

  const speciesOptions = ['All', 'Cow', 'Goat', 'Sheep', 'Chicken', 'Pig', 'Other'];

  const [isAddingRecord, setIsAddingRecord] = useState<{ type: string, animalId: string } | null>(null);

  const handleAddRecord = async (type: string, animalId: string, data: any) => {
    try {
      const collectionName = `kuku_${type}_records`;
      await addDoc(collection(db, collectionName), {
        ...data,
        livestockId: animalId,
        userId: user?.id,
        createdAt: serverTimestamp()
      });
      toast.success('Record added successfully');
      setIsAddingRecord(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `kuku_${type}_records`);
      toast.error('Failed to add record');
    }
  };

  const handleSellAnimal = async (sellType: 'live' | 'regular' | 'product') => {
    if (!selectedAnimal || !user) return;
    
    // If props are provided, use them to open the forms in the parent component
    if (sellType === 'product' && onSellAsProduct) {
      onSellAsProduct(selectedAnimal);
      return;
    }
    if ((sellType === 'live' || sellType === 'regular') && onSellAsAuction) {
      onSellAsAuction(selectedAnimal, sellType === 'live');
      return;
    }

    try {
      if (sellType === 'product') {
        await addDoc(collection(db, 'kuku_products'), {
          name: selectedAnimal.name || `${selectedAnimal.species} - ${selectedAnimal.tagNumber}`,
          price: 0, // Vendor will need to update this
          stock: 1,
          category: selectedAnimal.species,
          unit: 'Piece',
          emoji: '🐄',
          image: selectedAnimal.image,
          description: `Livestock: ${selectedAnimal.breed}. Tag: ${selectedAnimal.tagNumber}. Health: ${selectedAnimal.healthStatus}`,
          location: selectedAnimal.location,
          region: user.region || '',
          vendorId: user.id,
          vendorName: user.shopName || user.name,
          approved: false,
          isLivestock: true,
          tagNumber: selectedAnimal.tagNumber,
          breed: selectedAnimal.breed,
          weight: selectedAnimal.weight,
          gender: selectedAnimal.gender,
          healthStatus: selectedAnimal.healthStatus,
          birthDate: selectedAnimal.birthDate,
          livestockId: selectedAnimal.id,
          createdAt: serverTimestamp()
        });
        toast.success('Added to products. Please update price in Vendor Portal.');
      } else if (sellType === 'regular' || sellType === 'live') {
        await addDoc(collection(db, 'kuku_auctions'), {
          vendorId: user.id,
          vendorName: user.shopName || user.name,
          productName: selectedAnimal.name || `${selectedAnimal.species} - ${selectedAnimal.tagNumber}`,
          description: `Livestock: ${selectedAnimal.breed}. Tag: ${selectedAnimal.tagNumber}. Health: ${selectedAnimal.healthStatus}`,
          startingPrice: 0,
          minIncrement: 5000,
          currentBid: 0,
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h default
          location: selectedAnimal.location,
          status: 'active',
          image: selectedAnimal.image,
          isLive: sellType === 'live',
          tagNumber: selectedAnimal.tagNumber,
          breed: selectedAnimal.breed,
          weight: selectedAnimal.weight,
          gender: selectedAnimal.gender,
          healthStatus: selectedAnimal.healthStatus,
          birthDate: selectedAnimal.birthDate,
          livestockId: selectedAnimal.id,
          createdAt: serverTimestamp()
        });
        toast.success(`Added to ${sellType === 'live' ? 'Live' : 'Regular'} Auction.`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to list for sale');
    }
  };

  if (selectedAnimal) {
    return (
      <div className="p-4 max-w-4xl mx-auto pb-24">
        <button 
          onClick={() => setSelectedAnimal(null)}
          className="flex items-center text-emerald-600 mb-6 hover:underline"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to List
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden mb-6">
          <div className="relative h-48 sm:h-64">
            <img 
              src={selectedAnimal.image || 'https://picsum.photos/seed/livestock/800/600'} 
              alt={selectedAnimal.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 bg-white p-3 rounded-2xl shadow-xl border-4 border-emerald-50 group cursor-pointer" onClick={() => setQrModalOpen(true)}>
              <QRCodeSVG 
                id="animal-qr" 
                value={`${window.location.origin}/livestock/${selectedAnimal.id}`}
                size={100}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: selectedAnimal.image || 'https://cdn-icons-png.flaticon.com/512/2395/2395796.png',
                  x: undefined,
                  y: undefined,
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
              <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors rounded-xl flex items-center justify-center">
                <QrCode className="w-6 h-6 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-bold text-white">{selectedAnimal.name || `Animal #${selectedAnimal.tagNumber}`}</h1>
                  <p className="text-emerald-100">{selectedAnimal.breed} {selectedAnimal.species}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  selectedAnimal.status === 'alive' ? 'bg-emerald-500 text-white' : 'bg-gray-500 text-white'
                }`}>
                  {selectedAnimal.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex border-b border-emerald-50 overflow-x-auto no-scrollbar">
            {[
              { id: 'info', label: 'Info', icon: Activity },
              { id: 'health', label: 'Health', icon: Syringe },
              { id: 'breeding', label: 'Breeding', icon: Baby },
              { id: 'production', label: 'Production', icon: Milk },
              { id: 'nutrition', label: 'Nutrition', icon: Utensils },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' 
                    : 'border-transparent text-gray-500 hover:text-emerald-600 hover:bg-emerald-50/30'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'info' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center">
                      <Activity className="w-4 h-4 mr-2 text-emerald-500" />
                      Animal Details
                    </h3>
                    <div className="space-y-3">
                      <DetailRow icon={Tag} label="Tag Number" value={selectedAnimal.tagNumber} />
                      <DetailRow icon={Calendar} label="Birth Date" value={selectedAnimal.birthDate} />
                      <DetailRow icon={Calendar} label="Age" value={selectedAnimal.age || calculateAge(selectedAnimal.birthDate)} />
                      <DetailRow icon={Weight} label="Weight" value={selectedAnimal.weight ? `${selectedAnimal.weight} kg` : 'N/A'} />
                      <DetailRow icon={User} label="Gender" value={selectedAnimal.gender} />
                      <DetailRow icon={Activity} label="Health Status" value={selectedAnimal.healthStatus} />
                      <DetailRow icon={Syringe} label="Vaccination" value={selectedAnimal.vaccinationStatus} />
                      {selectedAnimal.gender === 'female' && (
                        <>
                          <DetailRow icon={Baby} label="Pregnancy" value={selectedAnimal.pregnancyStatus || 'Not Pregnant'} />
                          {selectedAnimal.pregnancyStatus === 'Pregnant' && (
                            <DetailRow icon={Calendar} label="Expected Delivery" value={selectedAnimal.expectedDeliveryDate || 'N/A'} />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-emerald-500" />
                      Location & Physical
                    </h3>
                    <div className="space-y-3">
                      <DetailRow icon={MapPin} label="Location" value={selectedAnimal.location} />
                      <DetailRow icon={MapPin} label="Farm Section" value={selectedAnimal.farmSection || 'N/A'} />
                      <DetailRow icon={Tag} label="Color/Markings" value={selectedAnimal.colorMarkings || 'N/A'} />
                    </div>
                    <h3 className="font-semibold text-gray-900 flex items-center pt-4">
                      <User className="w-4 h-4 mr-2 text-emerald-500" />
                      Owner Information
                    </h3>
                    <div className="space-y-3">
                      <DetailRow icon={User} label="Owner" value={selectedAnimal.ownerName} />
                      <DetailRow icon={Phone} label="Phone" value={selectedAnimal.ownerPhone} />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-emerald-50">
                  <h3 className="font-semibold text-gray-900 mb-4">Uza Mnyama Huyu</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button 
                      onClick={() => handleSellAnimal('live')}
                      className="flex flex-col items-center p-4 bg-red-50 rounded-2xl border border-red-100 hover:bg-red-100 transition-colors group"
                    >
                      <Video className="w-6 h-6 text-red-500 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-bold text-red-900">Mnada Live</span>
                      <span className="text-[10px] text-red-600">Uza kwa video live</span>
                    </button>
                    <button 
                      onClick={() => handleSellAnimal('regular')}
                      className="flex flex-col items-center p-4 bg-amber-50 rounded-2xl border border-amber-100 hover:bg-amber-100 transition-colors group"
                    >
                      <Gavel className="w-6 h-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-bold text-amber-900">Mnada wa Kawaida</span>
                      <span className="text-[10px] text-amber-600">Weka dau la kuanzia</span>
                    </button>
                    <button 
                      onClick={() => handleSellAnimal('product')}
                      className="flex flex-col items-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-colors group"
                    >
                      <Package className="w-6 h-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-bold text-emerald-900">Uza kama Bidhaa</span>
                      <span className="text-[10px] text-emerald-600">Bei maalum (Fixed Price)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'health' && (
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center">
                      <Syringe className="w-4 h-4 mr-2 text-emerald-500" />
                      Vaccination History
                    </h3>
                    <button 
                      onClick={() => setIsAddingRecord({ type: 'vaccination', animalId: selectedAnimal.id })}
                      className="text-sm text-emerald-600 font-medium hover:underline"
                    >
                      + Add Vaccine
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(Array.isArray(vaccinationRecords) ? vaccinationRecords : []).filter(r => r.livestockId === selectedAnimal.id).map(record => (
                      <div key={record.id} className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <div className="flex justify-between">
                          <span className="font-medium text-emerald-900">{record.vaccineName}</span>
                          <span className="text-xs text-emerald-600">{record.date}</span>
                        </div>
                        <p className="text-xs text-emerald-700 mt-1">Next due: {record.nextDueDate}</p>
                        <button 
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Futa Kumbukumbu',
                              message: 'Je, una uhakika unataka kufuta kumbukumbu hii ya chanjo?',
                              onConfirm: async () => {
                                try {
                                  await deleteDoc(doc(db, 'kuku_vaccination_records', record.id));
                                  toast.success('Kumbukumbu imefutwa');
                                } catch (e) {
                                  handleFirestoreError(e, OperationType.DELETE, `kuku_vaccination_records/${record.id}`);
                                }
                              }
                            });
                          }}
                          className="text-[10px] text-red-500 mt-2 hover:underline"
                        >
                          Futa
                        </button>
                      </div>
                    ))}
                    {(Array.isArray(vaccinationRecords) ? vaccinationRecords : []).filter(r => r.livestockId === selectedAnimal.id).length === 0 && (
                      <p className="text-sm text-gray-500 italic">No vaccination records found.</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center">
                      <Stethoscope className="w-4 h-4 mr-2 text-emerald-500" />
                      Medical History
                    </h3>
                    <button 
                      onClick={() => setIsAddingRecord({ type: 'medical', animalId: selectedAnimal.id })}
                      className="text-sm text-emerald-600 font-medium hover:underline"
                    >
                      + Add Treatment
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(Array.isArray(medicalRecords) ? medicalRecords : []).filter(r => r.livestockId === selectedAnimal.id).map(record => (
                      <div key={record.id} className="p-3 bg-red-50 rounded-xl border border-red-100">
                        <div className="flex justify-between">
                          <span className="font-medium text-red-900">{record.disease}</span>
                          <span className="text-xs text-red-600">{record.date}</span>
                        </div>
                        <p className="text-xs text-red-700 mt-1">Treatment: {record.medicine}</p>
                        <p className="text-xs font-bold text-red-800 mt-1">Cost: TSh {record.cost.toLocaleString()}</p>
                        <button 
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Futa Kumbukumbu',
                              message: 'Je, una uhakika unataka kufuta kumbukumbu hii ya matibabu?',
                              onConfirm: async () => {
                                try {
                                  await deleteDoc(doc(db, 'kuku_medical_records', record.id));
                                  toast.success('Kumbukumbu imefutwa');
                                } catch (e) {
                                  handleFirestoreError(e, OperationType.DELETE, `kuku_medical_records/${record.id}`);
                                }
                              }
                            });
                          }}
                          className="text-[10px] text-red-500 mt-2 hover:underline"
                        >
                          Futa
                        </button>
                      </div>
                    ))}
                    {(Array.isArray(medicalRecords) ? medicalRecords : []).filter(r => r.livestockId === selectedAnimal.id).length === 0 && (
                      <p className="text-sm text-gray-500 italic">No medical records found.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'breeding' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Baby className="w-4 h-4 mr-2 text-emerald-500" />
                    Breeding Records
                  </h3>
                  <button className="text-sm text-emerald-600 font-medium hover:underline">+ Add Record</button>
                </div>
                <div className="space-y-4">
                  {(Array.isArray(breedingRecords) ? breedingRecords : []).filter(r => r.livestockId === selectedAnimal.id).map(record => (
                    <div key={record.id} className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-purple-600 uppercase font-bold">Mating Date</p>
                          <p className="text-sm font-medium">{record.matingDate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-purple-600 uppercase font-bold">Sire ID</p>
                          <p className="text-sm font-medium">{record.sireId || 'Unknown'}</p>
                        </div>
                        {record.birthDate && (
                          <>
                            <div>
                              <p className="text-xs text-purple-600 uppercase font-bold">Birth Date</p>
                              <p className="text-sm font-medium">{record.birthDate}</p>
                            </div>
                            <div>
                              <p className="text-xs text-purple-600 uppercase font-bold">Offspring</p>
                              <p className="text-sm font-medium">{record.offspringCount} ({record.maleOffspring}M, {record.femaleOffspring}F)</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {(Array.isArray(breedingRecords) ? breedingRecords : []).filter(r => r.livestockId === selectedAnimal.id).length === 0 && (
                    <p className="text-sm text-gray-500 italic">No breeding records found.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'production' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Milk className="w-4 h-4 mr-2 text-emerald-500" />
                    Production Records
                  </h3>
                  <button className="text-sm text-emerald-600 font-medium hover:underline">+ Add Entry</button>
                </div>
                <div className="space-y-3">
                  {(Array.isArray(productionRecords) ? productionRecords : []).filter(r => r.livestockId === selectedAnimal.id).map(record => (
                    <div key={record.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <span className="text-sm font-medium text-blue-900">{record.date}</span>
                      <span className="text-lg font-bold text-blue-600">
                        {record.milkLiters ? `${record.milkLiters}L` : `${record.eggCount} Eggs`}
                      </span>
                    </div>
                  ))}
                  {(Array.isArray(productionRecords) ? productionRecords : []).filter(r => r.livestockId === selectedAnimal.id).length === 0 && (
                    <p className="text-sm text-gray-500 italic">No production records found.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'nutrition' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Utensils className="w-4 h-4 mr-2 text-emerald-500" />
                    Nutrition & Feeding
                  </h3>
                  <button className="text-sm text-emerald-600 font-medium hover:underline">+ Update Feed</button>
                </div>
                <div className="space-y-4">
                  {(Array.isArray(nutritionRecords) ? nutritionRecords : []).filter(r => r.livestockId === selectedAnimal.id).map(record => (
                    <div key={record.id} className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                      <div className="flex justify-between mb-2">
                        <span className="font-bold text-orange-900">{record.feedType}</span>
                        <span className="text-xs text-orange-600">{record.date}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-orange-600">Amount/Day</p>
                          <p className="text-sm font-medium">{record.amountPerDay} kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-orange-600">Cost/Day</p>
                          <p className="text-sm font-medium">TSh {record.costPerDay.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(Array.isArray(nutritionRecords) ? nutritionRecords : []).filter(r => r.livestockId === selectedAnimal.id).length === 0 && (
                    <p className="text-sm text-gray-500 italic">No nutrition records found.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => handleSellAnimal('live')}
            className="flex items-center justify-center py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            <Activity className="w-4 h-4 mr-2" />
            Live Auction
          </button>
          <button 
            onClick={() => handleSellAnimal('regular')}
            className="flex items-center justify-center py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Regular Auction
          </button>
          <button 
            onClick={() => handleSellAnimal('product')}
            className="flex items-center justify-center py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            <Tag className="w-4 h-4 mr-2" />
            Regular Product
          </button>
        </div>

        <div className="flex gap-4 mt-4">
          <button 
            onClick={() => handleDeleteAnimal(selectedAnimal.id)}
            className="flex-1 flex items-center justify-center py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Animal
          </button>
          <button 
            onClick={() => setQrModalOpen(true)}
            className="flex-1 flex items-center justify-center py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
          >
            <QrCode className="w-4 h-4 mr-2" />
            View & Download QR
          </button>
        </div>

        <QRCodeModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          url={`${window.location.origin}/livestock/${selectedAnimal.id}`}
          title={selectedAnimal.name || `Animal #${selectedAnimal.tagNumber}`}
          subtitle={`Livestock ID: ${selectedAnimal.tagNumber} • ${selectedAnimal.breed}`}
          logo={selectedAnimal.image}
        />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Livestock Manager</h1>
          <p className="text-gray-500">Manage your farm animals and records</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-3 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search by tag or name..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
          {speciesOptions.map(species => (
            <button
              key={species}
              onClick={() => setFilterSpecies(species)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                filterSpecies === species 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-gray-600 border border-emerald-100 hover:bg-emerald-50'
              }`}
            >
              {species}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredLivestock.map(animal => (
          <motion.div
            layoutId={animal.id}
            key={animal.id}
            onClick={() => setSelectedAnimal(animal)}
            className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-emerald-50 flex-shrink-0">
                <img 
                  src={animal.image || 'https://picsum.photos/seed/livestock/200/200'} 
                  alt={animal.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900 truncate">
                    {animal.name || `Animal #${animal.tagNumber}`}
                  </h3>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                </div>
                <p className="text-sm text-gray-500">{animal.breed} {animal.species}</p>
                <div className="flex items-center mt-2 gap-3">
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    {animal.tagNumber}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center">
                    <Weight className="w-3 h-3 mr-1" />
                    {animal.weight}kg
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {filteredLivestock.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-emerald-200">
            <Activity className="w-12 h-12 text-emerald-200 mx-auto mb-4" />
            <p className="text-gray-500">No animals found. Add your first livestock!</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/50">
                <h2 className="text-xl font-bold text-gray-900">Add New Animal</h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleAddAnimal} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-lg">🐄</span>
                    Basic Info
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Tag Number *</label>
                      <input 
                        type="text"
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        value={newAnimal.tagNumber}
                        onChange={e => setNewAnimal({...newAnimal, tagNumber: e.target.value})}
                        placeholder="Auto-generated if empty"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Name (Optional)</label>
                      <input 
                        type="text"
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        value={newAnimal.name}
                        onChange={e => setNewAnimal({...newAnimal, name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Species *</label>
                      <select 
                        required
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        value={newAnimal.species}
                        onChange={e => setNewAnimal({...newAnimal, species: e.target.value})}
                      >
                        {['Cow', 'Goat', 'Sheep', 'Chicken', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Breed</label>
                      <input 
                        type="text"
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        value={newAnimal.breed}
                        onChange={e => setNewAnimal({...newAnimal, breed: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Gender *</label>
                    <div className="flex gap-2">
                      {['male', 'female'].map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setNewAnimal({...newAnimal, gender: g as any})}
                          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                            newAnimal.gender === g 
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' 
                              : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Physical Details */}
                <div className="space-y-4 pt-4 border-t border-gray-50">
                  <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-lg">📊</span>
                    Physical Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Weight (kg)</label>
                      <input 
                        type="number"
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        value={newAnimal.weight || ''}
                        onChange={e => setNewAnimal({...newAnimal, weight: e.target.value ? Number(e.target.value) : undefined})}
                        placeholder="Empty"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Birth Date *</label>
                      <input 
                        required
                        type="date"
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        value={newAnimal.birthDate}
                        onChange={e => setNewAnimal({...newAnimal, birthDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Color / Markings</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                      value={newAnimal.colorMarkings}
                      onChange={e => setNewAnimal({...newAnimal, colorMarkings: e.target.value})}
                      placeholder="e.g. brown, black spots"
                    />
                  </div>
                </div>

                {/* Health Info */}
                <div className="space-y-4 pt-4 border-t border-gray-50">
                  <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-lg">❤️</span>
                    Health Info
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Health Status</label>
                      <select 
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        value={newAnimal.healthStatus}
                        onChange={e => setNewAnimal({...newAnimal, healthStatus: e.target.value as any})}
                      >
                        {['Healthy', 'Sick', 'Injured'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Vaccination</label>
                      <select 
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        value={newAnimal.vaccinationStatus}
                        onChange={e => setNewAnimal({...newAnimal, vaccinationStatus: e.target.value as any})}
                      >
                        {['Vaccinated', 'Not Vaccinated'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Last Treatment</label>
                      <input 
                        type="date"
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        value={newAnimal.lastTreatmentDate}
                        onChange={e => setNewAnimal({...newAnimal, lastTreatmentDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Notes</label>
                      <input 
                        type="text"
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        value={newAnimal.notes}
                        onChange={e => setNewAnimal({...newAnimal, notes: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Reproduction */}
                {newAnimal.gender === 'female' && (
                  <div className="space-y-4 pt-4 border-t border-gray-50">
                    <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-lg">🐣</span>
                      Reproduction
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Pregnancy Status</label>
                        <select 
                          className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                          value={newAnimal.pregnancyStatus}
                          onChange={e => setNewAnimal({...newAnimal, pregnancyStatus: e.target.value as any})}
                        >
                          {['Pregnant', 'Not Pregnant'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      {newAnimal.pregnancyStatus === 'Pregnant' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Expected Delivery</label>
                          <input 
                            type="date"
                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                            value={newAnimal.expectedDeliveryDate}
                            onChange={e => setNewAnimal({...newAnimal, expectedDeliveryDate: e.target.value})}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Location Info */}
                <div className="space-y-4 pt-4 border-t border-gray-50">
                  <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-lg">📍</span>
                    Location Info
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Location / Village *</label>
                      <input 
                        required
                        type="text"
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        value={newAnimal.location}
                        onChange={e => setNewAnimal({...newAnimal, location: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Farm Section</label>
                      <input 
                        type="text"
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        value={newAnimal.farmSection}
                        onChange={e => setNewAnimal({...newAnimal, farmSection: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Image */}
                <div className="space-y-4 pt-4 border-t border-gray-50">
                  <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-lg">🖼️</span>
                    Image
                  </h3>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Image Link</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                      value={newAnimal.image}
                      onChange={e => setNewAnimal({...newAnimal, image: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <Save className="w-5 h-5" />
                  Save Animal
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DetailRow: React.FC<{ icon: any, label: string, value: string }> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
    <div className="flex items-center text-gray-500">
      <Icon className="w-4 h-4 mr-2" />
      <span className="text-sm">{label}</span>
    </div>
    <span className="text-sm font-semibold text-gray-900">{value}</span>
  </div>
);

export default LivestockManager;
