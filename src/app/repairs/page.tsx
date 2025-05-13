'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { convertToUTC, formatDateTime } from '@/utils/dateUtils';

interface Repair {
  id: number;
  customer_id: number;
  bike_model: string;
  repair_start: string;
  repair_end: string | null;
  delivery_date: string | null;
  price: number;
  notes: string;
  status: 'pending' | 'in progress' | 'completed' | 'delivered' | 'canceled';
  created_at: string;
}

interface Customer {
  id: number;
  name: string;
}

interface RepairUpdate {
  status: Repair['status'];
  repair_start?: string | null;
  repair_end?: string | null;
  delivery_date?: string | null;
}

// Update getStatusColor to use English status values
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'in progress':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'delivered':
      return 'bg-purple-100 text-purple-800';
    case 'canceled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Update getNextStatus to use English status values
const getNextStatus = (currentStatus: string): Repair['status'] => {
  switch (currentStatus) {
    case 'pending':
      return 'in progress';
    case 'in progress':
      return 'completed';
    case 'completed':
      return 'delivered';
    default:
      return currentStatus as Repair['status'];
  }
};

// Update getStatusButtonText to use English status values
const getStatusButtonText = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'Iniciar Reparación';
    case 'in progress':
      return 'Completar Reparación';
    case 'completed':
      return 'Marcar como Entregado';
    default:
      return '';
  }
};

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showEditDateModal, setShowEditDateModal] = useState(false);
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [newRepair, setNewRepair] = useState({
    customer_id: '',
    bike_model: '',
    repair_start: '',
    delivery_date: '',
    price: '',
    notes: '',
    status: 'pending' as const
  });
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const supabase = createClient();

  const fetchRepairs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('repairs')
        .select('*')
        .not('status', 'eq', 'canceled')
        .not('status', 'eq', 'delivered')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Error fetching repairs: ${error.message}`);
      }

      if (!data) {
        console.warn('No repairs data returned from Supabase');
        setRepairs([]);
        return;
      }

      setRepairs(data);
    } catch (error) {
      console.error('Error in fetchRepairs:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred while fetching repairs');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, [supabase]);

  useEffect(() => {
    fetchRepairs();
    fetchCustomers();
  }, [fetchRepairs, fetchCustomers]);

  const handleAddRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('repairs')
        .insert([{
          customer_id: newRepair.customer_id,
          bike_model: newRepair.bike_model,
          repair_start: null,
          repair_end: null,
          delivery_date: newRepair.delivery_date ? convertToUTC(new Date(newRepair.delivery_date)) : null,
          price: parseFloat(newRepair.price),
          notes: newRepair.notes,
          status: 'pending'
        }]);

      if (error) throw error;
      setShowAddModal(false);
      setNewRepair({
        customer_id: '',
        bike_model: '',
        repair_start: '',
        delivery_date: '',
        price: '',
        notes: '',
        status: 'pending'
      });
      fetchRepairs();
    } catch (error) {
      console.error('Error adding repair:', error);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomer])
        .select()
        .single();

      if (error) throw error;

      setCustomers(prev => [...prev, data]);
      setNewRepair(prev => ({ ...prev, customer_id: data.id.toString() }));
      setShowAddCustomerModal(false);
      setNewCustomer({ name: '', email: '', phone: '' });
    } catch (error) {
      console.error('Error adding customer:', error);
      setError('Error al agregar el cliente. Por favor, intenta de nuevo.');
    }
  };

  const handleStatusUpdate = async (repairId: number, currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus);
    if (nextStatus === currentStatus) return;

    try {
      const updateData: RepairUpdate = { status: nextStatus };
      
      // Si estamos iniciando la reparación (cambiando de 'pending' a 'in progress')
      if (currentStatus === 'pending' && nextStatus === 'in progress') {
        updateData.repair_start = convertToUTC(new Date()).toISOString();
      }
      // Si estamos completando la reparación (cambiando de 'in progress' a 'completed')
      else if (currentStatus === 'in progress' && nextStatus === 'completed') {
        updateData.repair_end = convertToUTC(new Date()).toISOString();
      }
      // Si estamos entregando la reparación (cambiando de 'completed' a 'delivered')
      else if (currentStatus === 'completed' && nextStatus === 'delivered') {
        updateData.delivery_date = convertToUTC(new Date()).toISOString();
      }

      const { error } = await supabase
        .from('repairs')
        .update(updateData)
        .eq('id', repairId);

      if (error) throw error;
      fetchRepairs();
    } catch (error) {
      console.error('Error updating repair status:', error);
    }
  };

  const handleCancelRepair = async (repairId: number) => {
    try {
      const { error } = await supabase
        .from('repairs')
        .update({ status: 'canceled' })
        .eq('id', repairId);

      if (error) throw error;
      fetchRepairs();
    } catch (error) {
      console.error('Error canceling repair:', error);
    }
  };

  const handleShowAddModal = () => {
    setShowAddModal(true);
    setNewRepair({
      customer_id: '',
      bike_model: '',
      repair_start: convertToUTC(new Date()).toISOString(),
      delivery_date: '',
      price: '',
      notes: '',
      status: 'pending'
    });
  };

  const handleEditDeliveryDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRepair) return;

    try {
      const { error } = await supabase
        .from('repairs')
        .update({ delivery_date: newDeliveryDate ? convertToUTC(new Date(newDeliveryDate)) : null })
        .eq('id', editingRepair.id);

      if (error) {
        console.error('Error updating delivery date:', error);
        setError(`Error al actualizar la fecha: ${error.message}`);
        return;
      }

      setShowEditDateModal(false);
      setEditingRepair(null);
      setNewDeliveryDate('');
      fetchRepairs();
    } catch (error) {
      console.error('Error updating delivery date:', error);
      setError(error instanceof Error ? error.message : 'Error inesperado al actualizar la fecha');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </button>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold text-gray-900">Reparaciones</h1>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/repairs/history"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375Z" />
              <path fillRule="evenodd" d="m3.087 9 .54 9.176A3 3 0 0 0 6.62 21h10.757a3 3 0 0 0 2.995-2.824L20.913 9H3.087Zm6.163 3.75A.75.75 0 0 1 10 12h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
            <span className="hidden md:inline">Ver Historial</span>
          </Link>
          <button
            onClick={handleShowAddModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span className="hidden md:inline">Agregar Reparación</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repairs.map((repair) => (
            <div key={repair.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {customers.find(c => c.id === repair.customer_id)?.name}
                  </h3>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    {repair.bike_model}
                  </p>
                </div>
                <span className={`px-3 py-1 status-badge rounded-full ${getStatusColor(repair.status)}`}>
                  {repair.status.charAt(0).toUpperCase() + repair.status.slice(1)}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Inicio:
                  </span>
                  <span className="font-medium">
                    {repair.repair_start ? formatDateTime(repair.repair_start) : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Entrega Estimada:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {repair.delivery_date ? formatDateTime(repair.delivery_date) : 'No establecida'}
                    </span>
                    <button
                      onClick={() => {
                        setEditingRepair(repair);
                        setNewDeliveryDate(repair.delivery_date || '');
                        setShowEditDateModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    Precio:
                  </span>
                  <span className="price">
                    {repair.price.toFixed(2)}€
                  </span>
                </div>
                {repair.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="text-gray-600 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-2 align-middle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V19M19.5 19.5A2.5 2.5 0 0017 17H7a2.5 2.5 0 00-2.5 2.5M19.5 19.5V7A2.5 2.5 0 0017 4.5H7A2.5 2.5 0 004.5 7v12.5M19.5 19.5a2.5 2.5 0 01-2.5-2.5M4.5 19.5A2.5 2.5 0 007 17" />
                      </svg>
                      Notas:
                    </span>
                    <p className="text-sm text-gray-700 mt-1">{repair.notes}</p>
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => handleStatusUpdate(repair.id, repair.status)}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {repair.status === 'pending' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    )}
                    {repair.status === 'in progress' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {getStatusButtonText(repair.status)}
                  </button>
                  <button
                    onClick={() => handleCancelRepair(repair.id)}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white w-full h-full md:h-auto md:max-w-md md:rounded-lg md:p-6">
            <div className="p-4 md:p-6">
              <h2 className="text-2xl font-bold mb-4">Agregar Nueva Reparación</h2>
              <form onSubmit={handleAddRepair}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="customer">
                    Cliente
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="customer"
                      value={newRepair.customer_id}
                      onChange={(e) => setNewRepair({ ...newRepair, customer_id: e.target.value })}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      required
                    >
                      <option value="">Selecciona un cliente</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomerModal(true)}
                      className="bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="bike_model">
                    Modelo de Bicicleta
                  </label>
                  <input
                    type="text"
                    id="bike_model"
                    value={newRepair.bike_model}
                    onChange={(e) => setNewRepair({ ...newRepair, bike_model: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="delivery_date">
                    Fecha de Entrega Estimada
                  </label>
                  <input
                    type="datetime-local"
                    id="delivery_date"
                    value={newRepair.delivery_date}
                    onChange={(e) => setNewRepair({ ...newRepair, delivery_date: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="price">
                    Precio
                  </label>
                  <input
                    type="number"
                    id="price"
                    value={newRepair.price}
                    onChange={(e) => setNewRepair({ ...newRepair, price: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notes">
                    Notas
                  </label>
                  <textarea
                    id="notes"
                    value={newRepair.notes}
                    onChange={(e) => setNewRepair({ ...newRepair, notes: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewRepair({
                        customer_id: '',
                        bike_model: '',
                        repair_start: '',
                        delivery_date: '',
                        price: '',
                        notes: '',
                        status: 'pending'
                      });
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Agregar Reparación
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white w-full h-full md:h-auto md:max-w-md md:rounded-lg md:p-6">
            <div className="p-4 md:p-6">
              <h2 className="text-2xl font-bold mb-4">Agregar Nuevo Cliente</h2>
              <form onSubmit={handleAddCustomer}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="customer_name">
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="customer_name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="customer_email">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    id="customer_email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="customer_phone">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="customer_phone"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Agregar Cliente
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Repair Details Modal */}
      {selectedRepair && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] md:rounded-lg md:p-6 overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">Detalles de la Reparación</h2>
                <button
                  onClick={() => setSelectedRepair(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Inicio:
                  </span>
                  <span className="font-medium">
                    {formatDateTime(selectedRepair.repair_start)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Entrega Estimada:
                  </span>
                  <span className="font-medium">
                    {selectedRepair.delivery_date ? formatDateTime(selectedRepair.delivery_date) : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    Precio:
                  </span>
                  <span className="font-medium">
                    {selectedRepair.price.toFixed(2)}€
                  </span>
                </div>
                {selectedRepair.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="text-gray-600 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-2 align-middle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V19M19.5 19.5A2.5 2.5 0 0017 17H7a2.5 2.5 0 00-2.5 2.5M19.5 19.5V7A2.5 2.5 0 0017 4.5H7A2.5 2.5 0 004.5 7v12.5M19.5 19.5a2.5 2.5 0 01-2.5-2.5M4.5 19.5A2.5 2.5 0 007 17" />
                      </svg>
                      Notas:
                    </span>
                    <p className="text-sm text-gray-700 mt-1">{selectedRepair.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Delivery Date Modal */}
      {showEditDateModal && editingRepair && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white w-full h-full md:h-auto md:max-w-md md:rounded-lg md:p-6">
            <div className="p-4 md:p-6">
              <h2 className="text-2xl font-bold mb-4">Editar Fecha de Entrega Estimada</h2>
              <form onSubmit={handleEditDeliveryDate}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="delivery_date">
                    Fecha de Entrega Estimada
                  </label>
                  <input
                    type="datetime-local"
                    id="delivery_date"
                    value={newDeliveryDate}
                    onChange={(e) => setNewDeliveryDate(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditDateModal(false);
                      setEditingRepair(null);
                      setNewDeliveryDate('');
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 