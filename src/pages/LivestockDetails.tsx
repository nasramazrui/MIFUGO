import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Syringe, 
  Stethoscope, 
  Baby, 
  Milk, 
  Utensils, 
  ArrowLeft,
  Phone,
  MapPin,
  User,
  Calendar,
  Weight,
  Tag,
  ShieldCheck,
  AlertCircle,
  QrCode,
  Share2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Livestock } from '../types';
import { QRCodeModal } from '../components/QRCodeModal';

const LivestockDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { livestock, products, vaccinationRecords, medicalRecords, breedingRecords, productionRecords, nutritionRecords, livestockHealthRecords } = useApp();
  const [animal, setAnimal] = useState<Livestock | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'health' | 'breeding' | 'production' | 'nutrition'>('info');
  const [qrModalOpen, setQrModalOpen] = useState(false);

  useEffect(() => {
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
    const found = Array.isArray(allLivestock) ? allLivestock.find(l => l.id === id) : undefined;
    if (found) setAnimal(found);
  }, [id, livestock, products]);

  if (!animal) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Animal Not Found</h1>
        <p className="text-gray-500 mt-2">The QR code might be invalid or the animal has been removed.</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-6 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-emerald-600 text-white p-6 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setQrModalOpen(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2"
              title="Share QR Code"
            >
              <QrCode className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-white/10">
              <img 
                src={animal.image || 'https://picsum.photos/seed/livestock/200/200'} 
                alt={animal.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{animal.name || `Animal #${animal.tagNumber}`}</h1>
              <p className="text-emerald-100 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1" />
                Verified Livestock Data
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12 relative z-20">
        <div className="bg-white rounded-3xl shadow-xl shadow-emerald-900/5 overflow-hidden border border-emerald-50">
          <div className="flex border-b border-emerald-50 overflow-x-auto no-scrollbar bg-white sticky top-0 z-30">
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
                className={`flex items-center px-6 py-5 text-sm font-bold whitespace-nowrap border-b-4 transition-all ${
                  activeTab === tab.id 
                    ? 'border-emerald-500 text-emerald-600 bg-emerald-50/30' 
                    : 'border-transparent text-gray-400 hover:text-emerald-500'
                }`}
              >
                <tab.icon className={`w-4 h-4 mr-2 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 sm:p-8">
            {activeTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mr-3">
                      <Activity className="w-4 h-4 text-emerald-600" />
                    </div>
                    Animal Identity
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <DetailItem icon={Tag} label="Tag Number" value={animal.tagNumber} />
                    <DetailItem icon={Calendar} label="Birth Date" value={animal.birthDate} />
                    <DetailItem icon={Weight} label="Weight" value={`${animal.weight} kg`} />
                    <DetailItem icon={User} label="Gender" value={animal.gender} />
                    <DetailItem icon={Activity} label="Status" value={animal.status} accent />
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mr-3">
                      <User className="w-4 h-4 text-emerald-600" />
                    </div>
                    Ownership Details
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <DetailItem icon={User} label="Owner Name" value={animal.ownerName} />
                    <DetailItem icon={Phone} label="Contact" value={animal.ownerPhone} />
                    <DetailItem icon={MapPin} label="Location" value={animal.location} />
                  </div>
                </div>
              </div>
            )}

            {/* Lost Animal / Found Section */}
            <div className="mt-8 p-6 bg-amber-50 rounded-[32px] border-2 border-amber-100 border-dashed">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-amber-900 mb-1">Found this animal?</h3>
                  <p className="text-sm text-amber-700 mb-4">
                    If you have found this animal and believe it is lost, please contact the owner immediately using the details below.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a 
                      href={`tel:${animal.ownerPhone}`}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors"
                    >
                      <Phone size={16} /> Call Owner
                    </a>
                    <a 
                      href={`https://wa.me/${animal.ownerPhone?.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors"
                    >
                      <Share2 size={16} /> WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {activeTab === 'health' && (
              <div className="space-y-10">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center mr-3">
                      <Syringe className="w-4 h-4 text-emerald-600" />
                    </div>
                    Vaccination History
                  </h3>
                  <div className="space-y-4">
                    {(Array.isArray(vaccinationRecords) ? vaccinationRecords : []).filter(r => r.livestockId === animal.id).map(record => (
                      <div key={record.id} className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-emerald-900">{record.vaccineName}</p>
                          <p className="text-xs text-emerald-600 font-medium">Date: {record.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-emerald-500">Next Due</p>
                          <p className="text-sm font-bold text-emerald-700">{record.nextDueDate}</p>
                        </div>
                      </div>
                    ))}
                    {(Array.isArray(vaccinationRecords) ? vaccinationRecords : []).filter(r => r.livestockId === animal.id).length === 0 && (
                      <EmptyState icon={Syringe} message="No vaccination records available." />
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center mr-3">
                      <Stethoscope className="w-4 h-4 text-red-600" />
                    </div>
                    Medical & Treatments
                  </h3>
                  <div className="space-y-4">
                    {(Array.isArray(medicalRecords) ? medicalRecords : []).filter(r => r.livestockId === animal.id).map(record => (
                      <div key={record.id} className="p-4 bg-red-50 rounded-2xl border border-red-100">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-red-900">{record.disease}</p>
                          <span className="text-xs font-bold bg-red-200 text-red-700 px-2 py-1 rounded-lg">
                            {record.date}
                          </span>
                        </div>
                        <p className="text-sm text-red-700 mb-2">Treatment: <span className="font-bold">{record.medicine}</span></p>
                        <div className="flex justify-between items-center pt-2 border-t border-red-100">
                          <span className="text-xs text-red-500">Cost of Treatment</span>
                          <span className="font-bold text-red-800">TSh {record.cost.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                    {(Array.isArray(livestockHealthRecords) ? livestockHealthRecords : []).filter(r => r.productId === animal.id).map(record => (
                      <div key={record.id} className="p-4 bg-red-50 rounded-2xl border border-red-100">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-red-900">{record.title}</p>
                          <span className="text-xs font-bold bg-red-200 text-red-700 px-2 py-1 rounded-lg">
                            {record.date}
                          </span>
                        </div>
                        <p className="text-sm text-red-700 mb-2">Type: <span className="font-bold capitalize">{record.type}</span></p>
                        {record.notes && <p className="text-sm text-red-700 mb-2">Notes: <span>{record.notes}</span></p>}
                        {record.performedBy && <p className="text-sm text-red-700 mb-2">Performed By: <span>{record.performedBy}</span></p>}
                      </div>
                    ))}
                    {(Array.isArray(medicalRecords) ? medicalRecords : []).filter(r => r.livestockId === animal.id).length === 0 && (Array.isArray(livestockHealthRecords) ? livestockHealthRecords : []).filter(r => r.productId === animal.id).length === 0 && (
                      <EmptyState icon={Stethoscope} message="No medical history recorded." />
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'breeding' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center mr-3">
                    <Baby className="w-4 h-4 text-purple-600" />
                  </div>
                  Breeding & Lineage
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {(Array.isArray(breedingRecords) ? breedingRecords : []).filter(r => r.livestockId === animal.id).map(record => (
                    <div key={record.id} className="p-5 bg-purple-50 rounded-2xl border border-purple-100">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <StatItem label="Mating Date" value={record.matingDate} color="purple" />
                        <StatItem label="Sire ID" value={record.sireId || 'N/A'} color="purple" />
                        {record.birthDate && (
                          <>
                            <StatItem label="Birth Date" value={record.birthDate} color="purple" />
                            <StatItem label="Offspring" value={`${record.offspringCount} (${record.maleOffspring}M, ${record.femaleOffspring}F)`} color="purple" />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {(Array.isArray(breedingRecords) ? breedingRecords : []).filter(r => r.livestockId === animal.id).length === 0 && (
                    <EmptyState icon={Baby} message="No breeding records found." />
                  )}
                </div>
              </div>
            )}

            {activeTab === 'production' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                    <Milk className="w-4 h-4 text-blue-600" />
                  </div>
                  Production History
                </h3>
                <div className="space-y-3">
                  {(Array.isArray(productionRecords) ? productionRecords : []).filter(r => r.livestockId === animal.id).map(record => (
                    <div key={record.id} className="flex justify-between items-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-400 mr-3" />
                        <span className="font-bold text-blue-900">{record.date}</span>
                      </div>
                      <span className="text-xl font-black text-blue-600">
                        {record.milkLiters ? `${record.milkLiters}L` : `${record.eggCount} Eggs`}
                      </span>
                    </div>
                  ))}
                  {(Array.isArray(productionRecords) ? productionRecords : []).filter(r => r.livestockId === animal.id).length === 0 && (
                    <EmptyState icon={Milk} message="No production data recorded." />
                  )}
                </div>
              </div>
            )}

            {activeTab === 'nutrition' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center mr-3">
                    <Utensils className="w-4 h-4 text-orange-600" />
                  </div>
                  Nutrition & Diet
                </h3>
                <div className="space-y-4">
                  {(Array.isArray(nutritionRecords) ? nutritionRecords : []).filter(r => r.livestockId === animal.id).map(record => (
                    <div key={record.id} className="p-5 bg-orange-50 rounded-2xl border border-orange-100">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-bold text-orange-900">{record.feedType}</span>
                        <span className="text-xs font-bold bg-orange-200 text-orange-700 px-2 py-1 rounded-lg">
                          {record.date}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-orange-500 mb-1">Daily Amount</p>
                          <p className="text-lg font-bold text-orange-900">{record.amountPerDay} kg</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-orange-500 mb-1">Daily Cost</p>
                          <p className="text-lg font-bold text-orange-900">TSh {record.costPerDay.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(Array.isArray(nutritionRecords) ? nutritionRecords : []).filter(r => r.livestockId === animal.id).length === 0 && (
                    <EmptyState icon={Utensils} message="No nutrition records found." />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex gap-4 z-40">
        <button 
          onClick={() => setQrModalOpen(true)}
          className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
        >
          <QrCode className="w-5 h-5" />
          Share QR ID
        </button>
        <button className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold flex items-center justify-center gap-2">
          <Share2 className="w-5 h-5" />
          Share Link
        </button>
      </div>

      {animal && (
        <QRCodeModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          url={`${window.location.origin}/livestock/${animal.id}`}
          title={animal.name || `Animal #${animal.tagNumber}`}
          subtitle={`Livestock ID: ${animal.tagNumber} • ${animal.breed}`}
          logo={animal.image}
        />
      )}
    </div>
  );
};

const DetailItem: React.FC<{ icon: any, label: string, value: string, accent?: boolean }> = ({ icon: Icon, label, value, accent }) => (
  <div className={`flex items-center justify-between p-4 rounded-2xl border ${accent ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
    <div className="flex items-center text-gray-500">
      <Icon className={`w-4 h-4 mr-3 ${accent ? 'text-emerald-500' : ''}`} />
      <span className="text-sm font-medium">{label}</span>
    </div>
    <span className={`text-sm font-bold ${accent ? 'text-emerald-700 uppercase' : 'text-gray-900'}`}>{value}</span>
  </div>
);

const StatItem: React.FC<{ label: string, value: string, color: string }> = ({ label, value, color }) => (
  <div>
    <p className={`text-[10px] uppercase font-bold text-${color}-500 mb-1`}>{label}</p>
    <p className="text-sm font-bold text-gray-900">{value}</p>
  </div>
);

const EmptyState: React.FC<{ icon: any, message: string }> = ({ icon: Icon, message }) => (
  <div className="py-12 text-center">
    <Icon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
    <p className="text-gray-400 font-medium">{message}</p>
  </div>
);

export default LivestockDetails;
