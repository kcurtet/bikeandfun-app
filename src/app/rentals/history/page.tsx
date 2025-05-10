'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
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
}

interface Customer {
  id: number;
  name: string;
}

interface BikeType {
  id: number;
  type_name: string;
}

// Status-related functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'canceled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function RentalHistoryPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bikeTypes, setBikeTypes] = useState<BikeType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchRentals();
    fetchCustomers();
    fetchBikeTypes();
  }, []);

  const fetchRentals = async () => {
    try {
      setError(null);
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
              duration,
              duration_unit,
              price
            )
          )
        `)
        .not('status', 'eq', 'active')
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Error fetching rentals: ${error.message}`);
      setRentals(data || []);
    } catch (error) {
      console.error('Error fetching rentals:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred while fetching rentals');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('customers')
        .select('id, name');

      if (error) throw new Error(`Error fetching customers: ${error.message}`);
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred while fetching customers');
    }
  };

  const fetchBikeTypes = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('bike_types')
        .select('*');

      if (error) throw new Error(`Error fetching bike types: ${error.message}`);
      setBikeTypes(data || []);
    } catch (error) {
      console.error('Error fetching bike types:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred while fetching bike types');
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
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Rental History</h1>
        </div>
        <Link
          href="/rentals"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Back to Active Rentals
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rentals.map((rental) => (
            <div 
              key={rental.id} 
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer flex flex-col"
              onClick={() => setSelectedRental(rental)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  {customers.find(c => c.id === rental.customer_id)?.name}
                </h3>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(rental.status)}`}>
                  {rental.status}
                </span>
              </div>

              <div className="space-y-2 mb-4 flex-1">
                {rental.rental_items?.map((item) => (
                  <div key={item.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-gray-900">
                          {bikeTypes.find(b => b.id === item.bike_type_id)?.type_name}
                        </span>
                        <span className="text-gray-500 ml-2">
                          ({item.quantity} × {item.rental_pricing?.duration} {item.rental_pricing?.duration_unit})
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">
                        ${(item.rental_pricing?.price ? (item.rental_pricing.price * item.quantity) : 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-sm mt-6">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Start Date:
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
                    End Date:
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
                    Total Amount:
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    ${rental.rental_items?.reduce((total, item) => 
                      total + ((item.rental_pricing?.price || 0) * item.quantity), 0
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rental Details Modal */}
      {selectedRental && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Rental Details</h2>
              <button
                onClick={() => setSelectedRental(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
                  </div>
                  <p className="text-gray-600">
                    {customers.find(c => c.id === selectedRental.customer_id)?.name}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900">Status</h3>
                  </div>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedRental.status)}`}>
                    {selectedRental.status}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 5a1 1 0 011 1v1h1a1 1 0 110 2H9v1a1 1 0 11-2 0V9H6a1 1 0 110-2h1V6a1 1 0 011-1z" />
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">Bikes</h3>
                </div>
                <div className="space-y-3">
                  {selectedRental.rental_items?.map((item) => (
                    <div key={item.id} className="bg-white p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <span className="font-medium text-gray-900">
                              {bikeTypes.find(b => b.id === item.bike_type_id)?.type_name}
                            </span>
                            <span className="text-gray-500 ml-2">
                              ({item.quantity} × {item.rental_pricing?.duration} {item.rental_pricing?.duration_unit})
                            </span>
                          </div>
                        </div>
                        <span className="font-medium text-gray-900">
                          ${(item.rental_pricing?.price ? (item.rental_pricing.price * item.quantity) : 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900">Start Time</h3>
                  </div>
                  <p className="text-gray-600">{formatDateTime(selectedRental.start_date)}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900">Total Amount</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${selectedRental.rental_items?.reduce((total, item) => 
                      total + ((item.rental_pricing?.price || 0) * item.quantity), 0
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 