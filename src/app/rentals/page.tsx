'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { convertToUTC, convertToLocal, formatDateTime } from '@/utils/dateUtils';

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
    rental_pricing?: {
      duration: number;
      duration_unit: string;
      price: number;
    };
  }[];
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

const getStatusButtonText = (status: string): string => {
  switch (status) {
    case 'active':
      return 'Complete Rental';
    case 'completed':
      return 'Cancel Rental';
    default:
      return '';
  }
};

const getStatusButtonColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-600 hover:bg-green-700';
    case 'completed':
      return 'bg-red-600 hover:bg-red-700';
    default:
      return 'bg-gray-600 hover:bg-gray-700';
  }
};

export default function RentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bikeTypes, setBikeTypes] = useState<BikeType[]>([]);
  const [rentalRates, setRentalRates] = useState<RentalRate[]>([]);
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
    status: 'active' as const,
    items: [] as {
      bike_type_id: string;
      rental_pricing_id: string;
    }[]
  });
  const [availableRates, setAvailableRates] = useState<RentalRate[]>([]);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    fetchRentals();
    fetchCustomers();
    fetchBikeTypes();
    fetchRentalRates();
  }, []);

  const fetchRentals = async () => {
    try {
      const { data, error } = await supabase
        .from('rentals')
        .select(`
          *,
          rental_items (
            id,
            bike_type_id,
            rental_pricing_id,
            rental_pricing:rental_pricing_id (
              duration,
              duration_unit,
              price
            )
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRentals(data || []);
    } catch (error) {
      console.error('Error fetching rentals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchBikeTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('bike_types')
        .select('*');

      if (error) throw error;
      setBikeTypes(data || []);
    } catch (error) {
      console.error('Error fetching bike types:', error);
    }
  };

  const fetchRentalRates = async () => {
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
  };

  const calculateTotalCost = (bikeTypeId: string, duration: string, durationUnit: string) => {
    if (!bikeTypeId || !duration || !durationUnit) return '';

    const pricing = rentalRates.find(
      p => p.bike_type_id === parseInt(bikeTypeId) &&
           p.duration === parseInt(duration) &&
           p.duration_unit === durationUnit
    );

    return pricing ? pricing.price.toString() : '';
  };

  const handleBikeTypeChange = (index: number, bikeTypeId: string) => {
    const updatedItems = [...newRental.items];
    updatedItems[index] = {
      ...updatedItems[index],
      bike_type_id: bikeTypeId,
      rental_pricing_id: '',
    };
    setNewRental(prev => ({
      ...prev,
      items: updatedItems
    }));

    const rates = rentalRates.filter(r => r.bike_type_id === parseInt(bikeTypeId));
    setAvailableRates(rates);
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
      items: [...prev.items, { bike_type_id: '', rental_pricing_id: '' }]
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
      // First create the rental
      const { data: rentalData, error: rentalError } = await supabase
        .from('rentals')
        .insert([{
          customer_id: parseInt(newRental.customer_id),
          status: newRental.status,
          start_date: convertToUTC(new Date()).toISOString(),
        }])
        .select()
        .single();

      if (rentalError) throw rentalError;

      // Then create the rental items
      const rentalItems = newRental.items.map(item => ({
        rental_id: rentalData.id,
        bike_type_id: parseInt(item.bike_type_id),
        rental_pricing_id: parseInt(item.rental_pricing_id),
      }));

      const { error: itemsError } = await supabase
        .from('rental_items')
        .insert(rentalItems);

      if (itemsError) throw itemsError;

      setShowAddModal(false);
      setNewRental({
        customer_id: '',
        status: 'active',
        items: []
      });
      setAvailableRates([]);
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

      let endDate = new Date(date);
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Bike Rentals</h1>
        <div className="flex gap-4 items-center">
          <Link
            href="/rentals/history"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            View History
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Rental
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
            <div key={rental.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {customers.find(c => c.id === rental.customer_id)?.name}
                </h3>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(rental.status)}`}>
                  {rental.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {rental.rental_items?.map((item, index) => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-1">
                      <span className="font-medium text-gray-900">
                        {bikeTypes.find(b => b.id === item.bike_type_id)?.type_name}
                      </span>
                      {item.rental_pricing && (
                        <span className="text-sm text-gray-600 block">
                          {item.rental_pricing.duration} {item.rental_pricing.duration_unit}
                        </span>
                      )}
                    </div>
                    {item.rental_pricing && (
                      <span className="font-bold text-gray-900 text-lg">
                        ${item.rental_pricing.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Start Date:</span>
                  <span className="font-medium text-gray-900">
                    {formatDateTime(rental.start_date)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">End Date:</span>
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
                  <span className="text-gray-600 font-medium">Total Amount:</span>
                  <span className="text-xl font-bold text-gray-900">
                    ${rental.rental_items?.reduce((total, item) => 
                      total + (item.rental_pricing?.price || 0), 0
                    ).toFixed(2)}
                  </span>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={() => handleStatusUpdate(rental.id, rental.status)}
                    className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => handleCancelRental(rental.id)}
                    className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Add New Rental</h2>
            <form onSubmit={handleAddRental}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="customer">
                  Customer
                </label>
                <div className="flex gap-2">
                  <select
                    id="customer"
                    value={newRental.customer_id}
                    onChange={(e) => setNewRental(prev => ({ ...prev, customer_id: e.target.value }))}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(true)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                  >
                    Add New
                  </button>
                </div>
              </div>

              {newRental.items.map((item, index) => (
                <div key={index} className="mb-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Bike {index + 1}</h3>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeBikeFromRental(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Bike Type
                    </label>
                    <select
                      value={item.bike_type_id}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleBikeTypeChange(index, e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      required
                    >
                      <option value="">Select a bike type</option>
                      {bikeTypes.map((bikeType) => (
                        <option key={bikeType.id} value={bikeType.id}>
                          {bikeType.type_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {item.bike_type_id && (
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Duration
                      </label>
                      <select
                        value={item.rental_pricing_id}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDurationChange(index, e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                      >
                        <option value="">Select duration</option>
                        {rentalRates
                          .filter(r => r.bike_type_id === parseInt(item.bike_type_id))
                          .map((rate) => (
                            <option key={rate.id} value={rate.id}>
                              {rate.duration} {rate.duration_unit}{rate.duration > 1 ? 's' : ''} - ${rate.price.toFixed(2)}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}

              <div className="mb-4">
                <button
                  type="button"
                  onClick={addNewBikeToRental}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Add Another Bike
                </button>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewRental({
                      customer_id: '',
                      status: 'active',
                      items: []
                    });
                    setAvailableRates([]);
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  disabled={!newRental.customer_id || newRental.items.length === 0 || newRental.items.some(item => !item.rental_pricing_id)}
                >
                  Add Rental
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Add New Customer</h2>
            <form onSubmit={handleAddCustomer}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="customer_name">
                  Name
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
                  Email
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
                  Phone
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Add Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 