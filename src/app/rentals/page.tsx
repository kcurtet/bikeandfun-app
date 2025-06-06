'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { formatDateTime } from '@/utils/dateUtils';

interface Rental {
  id: number;
  customer_id: number;
  status: 'active' | 'completed' | 'canceled';
  start_date: string;
  created_at: string;
  rental_items?: {
    id: number;
    bike_type_id: number;
    rental_pricing_id: number;
    quantity: number;
    rental_pricing?: {
      duration: number;
      duration_unit: string;
      price: number;
    };
  }[];
  helmet_quantity?: number;
  lock_quantity?: number;
}

interface Customer {
  id: number;
  name: string;
}

interface BikeType {
  id: number;
  type_name: string;
  created_at: string;
}

interface RentalRate {
  id: number;
  bike_type_id: number;
  duration: number;
  duration_unit: 'hour' | 'day' | 'week';
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AccessoryPrices {
  helmet_price: number;
  lock_price: number;
}

// Status-related functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'canceled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getNextStatus = (currentStatus: string): string => {
  switch (currentStatus) {
    case 'active':
      return 'completed';
    case 'completed':
      return 'canceled';
    default:
      return currentStatus;
  }
};

export default function RentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bikeTypes, setBikeTypes] = useState<BikeType[]>([]);
  const [rentalRates, setRentalRates] = useState<RentalRate[]>([]);
  const [accessoryPrices, setAccessoryPrices] = useState<AccessoryPrices>({
    helmet_price: 0,
    lock_price: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [newRental, setNewRental] = useState({
    customer_id: '',
    status: 'active',
    items: [] as { bike_type_id: string; rental_pricing_id: string; quantity: number }[],
    helmet_quantity: 0,
    lock_quantity: 0
  });
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const supabase = createClient();

  const fetchRentals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('rentals')
        .select(`
          *,
          rental_items (
            id,
            bike_type_id,
            rental_pricing_id,
            quantity,
            rental_pricing:rental_pricing_id (
              id,
              duration,
              duration_unit,
              price
            )
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRentals(data || []);
    } catch (error) {
      console.error('Error fetching rentals:', error);
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

  const fetchBikeTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bike_types')
        .select('*');

      if (error) throw error;
      setBikeTypes(data || []);
    } catch (error) {
      console.error('Error fetching bike types:', error);
    }
  }, [supabase]);

  const fetchRentalRates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('rental_pricing')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setRentalRates(data || []);
    } catch (error) {
      console.error('Error fetching rental pricing:', error);
    }
  }, [supabase]);

  const fetchAccessoryPrices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('helmet_price, lock_price')
        .single();

      if (error) throw error;
      setAccessoryPrices(data || { helmet_price: 0, lock_price: 0 });
    } catch (error) {
      console.error('Error fetching accessory prices:', error);
    }
  }, [supabase]);

  useEffect(() => {
    fetchRentals();
    fetchCustomers();
    fetchBikeTypes();
    fetchRentalRates();
    fetchAccessoryPrices();
  }, [fetchRentals, fetchCustomers, fetchBikeTypes, fetchRentalRates, fetchAccessoryPrices]);

  const handleBikeTypeChange = (index: number, bikeTypeId: string) => {
    const updatedItems = [...newRental.items];
    updatedItems[index] = {
      ...updatedItems[index],
      bike_type_id: bikeTypeId,
      rental_pricing_id: ''
    };
    setNewRental(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleDurationChange = (index: number, rateId: string) => {
    const updatedItems = [...newRental.items];
    updatedItems[index] = {
      ...updatedItems[index],
      rental_pricing_id: rateId,
    };
    setNewRental(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const addNewBikeToRental = () => {
    setNewRental(prev => ({
      ...prev,
      items: [...prev.items, { bike_type_id: '', rental_pricing_id: '', quantity: 1 }]
    }));
  };

  const removeBikeFromRental = (index: number) => {
    const updatedItems = [...newRental.items];
    updatedItems.splice(index, 1);
    setNewRental(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleAddRental = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: rentalData, error: rentalError } = await supabase
        .from('rentals')
        .insert([{
          customer_id: parseInt(newRental.customer_id),
          status: newRental.status,
          start_date: new Date().toISOString(),
          helmet_quantity: newRental.helmet_quantity,
          lock_quantity: newRental.lock_quantity
        }])
        .select()
        .single();

      if (rentalError) throw rentalError;

      if (newRental.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('rental_items')
          .insert(
            newRental.items.map(item => ({
              rental_id: rentalData.id,
              bike_type_id: parseInt(item.bike_type_id),
              rental_pricing_id: parseInt(item.rental_pricing_id),
              quantity: item.quantity
            }))
          );

        if (itemsError) throw itemsError;
      }

      setShowAddModal(false);
      setNewRental({
        customer_id: '',
        status: 'active',
        items: [],
        helmet_quantity: 0,
        lock_quantity: 0
      });
      fetchRentals();
    } catch (error) {
      console.error('Error adding rental:', error);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomer])
        .select()
        .single();

      if (error) throw error;

      setCustomers(prev => [...prev, data]);
      setNewRental(prev => ({ ...prev, customer_id: data.id.toString() }));
      setShowAddCustomerModal(false);
      setNewCustomer({ name: '', email: '', phone: '' });
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  };

  const handleStatusUpdate = async (rentalId: number, currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus);
    if (nextStatus === currentStatus) return;

    try {
      const { error } = await supabase
        .from('rentals')
        .update({ status: nextStatus })
        .eq('id', rentalId);

      if (error) throw error;
      fetchRentals();
    } catch (error) {
      console.error('Error updating rental status:', error);
    }
  };

  const handleCancelRental = async (rentalId: number) => {
    try {
      const { error } = await supabase
        .from('rentals')
        .update({ status: 'canceled' })
        .eq('id', rentalId);

      if (error) throw error;
      fetchRentals();
    } catch (error) {
      console.error('Error canceling rental:', error);
    }
  };

  const calculateEndDate = (startDate: string, duration: number, durationUnit: string): string => {
    try {
      const date = new Date(startDate);
      if (isNaN(date.getTime())) {
        return '-';
      }

      const endDate = new Date(date);
      switch (durationUnit) {
        case 'hour':
          endDate.setHours(endDate.getHours() + duration);
          break;
        case 'day':
          endDate.setDate(endDate.getDate() + duration);
          break;
        case 'week':
          endDate.setDate(endDate.getDate() + (duration * 7));
          break;
        default:
          return '-';
      }

      return formatDateTime(endDate.toISOString());
    } catch (error) {
      console.error('Error calculating end date:', error);
      return '-';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold text-gray-900">Alquileres</h1>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/rentals/history"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375Z" />
              <path fillRule="evenodd" d="m3.087 9 .54 9.176A3 3 0 0 0 6.62 21h10.757a3 3 0 0 0 2.995-2.824L20.913 9H3.087Zm6.163 3.75A.75.75 0 0 1 10 12h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
            <span className="hidden md:inline">Ver Historial</span>
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span className="hidden md:inline">Agregar Alquiler</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rentals.map((rental) => (
            <div key={rental.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <h3 className="card-title text-gray-900 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  {customers.find(c => c.id === rental.customer_id)?.name}
                </h3>
                <span className={`px-3 py-1 status-badge rounded-full ${getStatusColor(rental.status)}`}>
                  {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                </span>
              </div>

              <div className="space-y-2 mb-4 flex-1">
                {rental.rental_items?.map((item) => (
                  <div key={item.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="font-medium text-gray-900">
                        {bikeTypes.find(b => b.id === item.bike_type_id)?.type_name}
                      </span>
                      <div className="text-gray-500 text-sm">
                        {item.quantity} × {item.rental_pricing?.duration} {(() => {
                          const unit = item.rental_pricing?.duration_unit;
                          const n = item.rental_pricing?.duration;
                          if (unit === 'hour') return n === 1 ? 'hora' : 'horas';
                          if (unit === 'day') return n === 1 ? 'día' : 'días';
                          if (unit === 'week') return n === 1 ? 'semana' : 'semanas';
                          return unit;
                        })()}
                      </div>
                    </div>
                    <span className="font-medium text-gray-900">
                      {(item.rental_pricing?.price ? (item.rental_pricing.price * item.quantity) : 0).toFixed(2)}€
                    </span>
                  </div>
                ))}
                {(rental.helmet_quantity || 0) > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="font-medium text-gray-900">Casco</span>
                      <div className="text-gray-500 text-sm">
                        {rental.helmet_quantity || 0} × {accessoryPrices.helmet_price}€
                      </div>
                    </div>
                    <span className="font-medium text-gray-900">
                      {((rental.helmet_quantity || 0) * accessoryPrices.helmet_price).toFixed(2)}€
                    </span>
                  </div>
                )}
                {(rental.lock_quantity || 0) > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="font-medium text-gray-900">Candado</span>
                      <div className="text-gray-500 text-sm">
                        {rental.lock_quantity || 0} × {accessoryPrices.lock_price}€
                      </div>
                    </div>
                    <span className="font-medium text-gray-900">
                      {((rental.lock_quantity || 0) * accessoryPrices.lock_price).toFixed(2)}€
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Fecha de Inicio:
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatDateTime(rental.start_date)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Fecha de Fin:
                  </span>
                  <span className="font-medium text-gray-900">
                    {rental.rental_items && rental.rental_items.length > 0 && rental.rental_items[0].rental_pricing ? 
                      calculateEndDate(
                        rental.start_date,
                        rental.rental_items[0].rental_pricing.duration,
                        rental.rental_items[0].rental_pricing.duration_unit
                      ) : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    Total:
                  </span>
                  <span className="price">
                    {(
                      (rental.rental_items?.reduce((total, item) => 
                        total + ((item.rental_pricing?.price || 0) * item.quantity), 0) || 0) +
                      ((rental.helmet_quantity || 0) * accessoryPrices.helmet_price) +
                      ((rental.lock_quantity || 0) * accessoryPrices.lock_price)
                    ).toFixed(2)}€
                  </span>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => handleStatusUpdate(rental.id, rental.status)}
                    className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Completar
                  </button>
                  <button
                    onClick={() => handleCancelRental(rental.id)}
                    className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
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
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Nuevo Alquiler</h2>
            <form onSubmit={handleAddRental}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Cliente</label>
                <select
                  value={newRental.customer_id}
                  onChange={(e) => setNewRental(prev => ({ ...prev, customer_id: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar cliente</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Accesorios</label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-sm text-gray-600">Cascos ({accessoryPrices.helmet_price}€/unidad)</label>
                    <input
                      type="number"
                      min="0"
                      value={newRental.helmet_quantity}
                      onChange={(e) => setNewRental(prev => ({ ...prev, helmet_quantity: parseInt(e.target.value) || 0 }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">Candados ({accessoryPrices.lock_price}€/unidad)</label>
                    <input
                      type="number"
                      min="0"
                      value={newRental.lock_quantity}
                      onChange={(e) => setNewRental(prev => ({ ...prev, lock_quantity: parseInt(e.target.value) || 0 }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Bicicletas</label>
                {newRental.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 mt-2">
                    <div>
                      <select
                        value={item.bike_type_id}
                        onChange={(e) => handleBikeTypeChange(index, e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      >
                        <option value="">Tipo de bici</option>
                        {bikeTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.type_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        value={item.rental_pricing_id}
                        onChange={(e) => handleDurationChange(index, e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      >
                        <option value="">Duración</option>
                        {rentalRates
                          .filter(rate => !item.bike_type_id || rate.bike_type_id === parseInt(item.bike_type_id))
                          .map(rate => (
                            <option key={rate.id} value={rate.id}>
                              {rate.duration} {rate.duration_unit}(s) - {rate.price}€
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const updatedItems = [...newRental.items];
                          updatedItems[index] = {
                            ...updatedItems[index],
                            quantity: parseInt(e.target.value) || 1
                          };
                          setNewRental(prev => ({ ...prev, items: updatedItems }));
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => removeBikeFromRental(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addNewBikeToRental}
                  className="mt-2 text-blue-500 hover:text-blue-700"
                >
                  + Añadir bicicleta
                </button>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
                >
                  Crear Alquiler
                </button>
              </div>
            </form>
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

      {/* Rental Details Modal */}
      {selectedRental && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] md:rounded-lg md:p-6 overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Detalles del Alquiler</h2>
                <button
                  onClick={() => setSelectedRental(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Rental details content */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 