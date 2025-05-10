'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { convertToUTC, convertToLocal, formatDateTime } from '@/utils/dateUtils';

interface Repair {
  id: number;
  customer_id: number;
  bike_model: string;
  repair_start: string;
  repair_end: string | null;
  delivery_date: string | null;
  price: number;
  notes: string;
  status: 'pending' | 'in progress' | 'completed' | 'canceled';
  created_at: string;
}

interface Customer {
  id: number;
  name: string;
}

// Status-related functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'in progress':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'canceled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getNextStatus = (currentStatus: string): string => {
  switch (currentStatus) {
    case 'pending':
      return 'in progress';
    case 'in progress':
      return 'completed';
    default:
      return currentStatus;
  }
};

const getStatusButtonText = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'Start';
    case 'in progress':
      return 'Complete';
    default:
      return '';
  }
};

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [newRepair, setNewRepair] = useState({
    customer_id: '',
    bike_model: '',
    repair_start: '',
    repair_end: '',
    delivery_date: '',
    price: '',
    notes: '',
    status: 'pending' as const,
  });
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchRepairs();
    fetchCustomers();
  }, []);

  const fetchRepairs = async () => {
    try {
      const { data, error } = await supabase
        .from('repairs')
        .select('*')
        .not('status', 'eq', 'completed')
        .not('status', 'eq', 'canceled');
        //.order('created_at', { ascending: false });

      if (error) throw error;
      setRepairs(data || []);
    } catch (error) {
      console.error('Error fetching repairs:', error);
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

  const handleAddRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('repairs')
        .insert([{
          customer_id: parseInt(newRepair.customer_id),
          bike_model: newRepair.bike_model,
          repair_start: convertToUTC(new Date(newRepair.repair_start)).toISOString(),
          repair_end: newRepair.repair_end || null,
          delivery_date: newRepair.delivery_date ? convertToUTC(new Date(newRepair.delivery_date)).toISOString() : null,
          price: parseFloat(newRepair.price) || 0,
          notes: newRepair.notes,
          status: newRepair.status,
        }]);

      if (error) throw error;
      setShowAddModal(false);
      setNewRepair({
        customer_id: '',
        bike_model: '',
        repair_start: '',
        repair_end: '',
        delivery_date: '',
        price: '',
        notes: '',
        status: 'pending',
      });
      fetchRepairs();
    } catch (error) {
      console.error('Error adding repair:', error);
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
      setNewRepair(prev => ({ ...prev, customer_id: data.id.toString() }));
      setShowAddCustomerModal(false);
      setNewCustomer({ name: '', email: '', phone: '' });
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  };

  const handleStatusUpdate = async (repairId: number, currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus);
    if (nextStatus === currentStatus) return;

    try {
      const updateData: any = { status: nextStatus };
      
      if (nextStatus === 'completed') {
        updateData.repair_end = convertToUTC(new Date()).toISOString();
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
        .update({ 
          status: 'canceled',
          repair_end: convertToUTC(new Date()).toISOString()
        })
        .eq('id', repairId);

      if (error) throw error;
      fetchRepairs();
    } catch (error) {
      console.error('Error canceling repair:', error);
    }
  };

  const handleShowAddModal = () => {
    const now = new Date();
    const deliveryDate = new Date(now.getTime() + 60 * 60 * 1000); // Add 1 hour
    const formattedDate = now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
    const formattedDeliveryDate = deliveryDate.toISOString().slice(0, 16);
    setNewRepair(prev => ({
      ...prev,
      repair_start: formattedDate,
      delivery_date: formattedDeliveryDate,
    }));
    setShowAddModal(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Bike Reparations</h1>
        </div>
        <div className="flex gap-4 items-center">
          <Link
            href="/repairs/history"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            View History
          </Link>
          <button
            onClick={handleShowAddModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Reparation
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
                  <h3 className="text-lg font-semibold text-gray-900">
                    {customers.find(c => c.id === repair.customer_id)?.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {repair.bike_model}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(repair.status)}`}>
                  {repair.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Start:</span>
                  <span className="font-medium">
                    {formatDateTime(repair.repair_start)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery:</span>
                  <span className="font-medium">
                    {repair.delivery_date ? formatDateTime(repair.delivery_date) : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-medium">
                    ${repair.price.toFixed(2)}
                  </span>
                </div>
                {repair.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="text-gray-600">Notes:</span>
                    <p className="text-sm text-gray-700 mt-1">{repair.notes}</p>
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => handleStatusUpdate(repair.id, repair.status)}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    {getStatusButtonText(repair.status)}
                  </button>
                  <button
                    onClick={() => handleCancelRepair(repair.id)}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Add New Reparation</h2>
            <form onSubmit={handleAddRepair}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="customer">
                  Customer
                </label>
                <div className="flex gap-2">
                  <select
                    id="customer"
                    value={newRepair.customer_id}
                    onChange={(e) => setNewRepair({ ...newRepair, customer_id: e.target.value })}
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
                    className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors"
                    title="Add Customer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="bike_model">
                  Bike Model
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
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="repair_start">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  id="repair_start"
                  value={newRepair.repair_start}
                  onChange={(e) => setNewRepair({ ...newRepair, repair_start: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="delivery_date">
                  Expected Delivery Date
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
                  Price
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
                  Notes
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
                      repair_end: '',
                      delivery_date: '',
                      price: '',
                      notes: '',
                      status: 'pending',
                    });
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Add Reparation
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