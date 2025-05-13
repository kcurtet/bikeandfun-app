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
    case 'activo':
      return 'bg-blue-100 text-blue-800';
    case 'completado':
      return 'bg-green-100 text-green-800';
    case 'cancelado':
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
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchRentals = useCallback(async () => {
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
  }, [supabase]);

  const fetchCustomers = useCallback(async () => {
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
  }, [supabase]);

  const fetchBikeTypes = useCallback(async () => {
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
  }, [supabase]);

  useEffect(() => {
    fetchRentals();
    fetchCustomers();
    fetchBikeTypes();
  }, [fetchRentals, fetchCustomers, fetchBikeTypes]);

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

  const handleEditRental = (rental: Rental) => {
    setEditingRental(rental);
  };

  const handleUpdateRental = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRental) return;

    try {
      const { error } = await supabase
        .from('rentals')
        .update({
          status: editingRental.status,
          start_date: editingRental.start_date
        })
        .eq('id', editingRental.id);

      if (error) {
        console.error('Error updating rental:', error);
        throw new Error(`Error updating rental: ${error.message}`);
      }

      setRentals(rentals.map(rental => 
        rental.id === editingRental.id ? editingRental : rental
      ));
      setEditingRental(null);
    } catch (error) {
      console.error('Error in handleUpdateRental:', error);
      setError(error instanceof Error ? error.message : 'Error al actualizar el alquiler');
    }
  };

  const handleDeleteRental = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este alquiler?')) return;

    try {
      const { error } = await supabase
        .from('rentals')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting rental:', error);
        throw new Error(`Error deleting rental: ${error.message}`);
      }

      setRentals(rentals.filter(rental => rental.id !== id));
      setSelectedRental(null);
    } catch (error) {
      console.error('Error in handleDeleteRental:', error);
      setError(error instanceof Error ? error.message : 'Error al eliminar el alquiler');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Historial de Alquileres</h1>
        </div>
        <Link
          href="/rentals"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Volver a Alquileres Activos
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
              </div>

              <div className="space-y-3 text-sm mt-6">
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
                  <span className="text-xl font-bold text-gray-900">
                    {rental.rental_items?.reduce((total, item) => 
                      total + ((item.rental_pricing?.price || 0) * item.quantity), 0
                    ).toFixed(2)}€
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

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900">Información del Cliente</h3>
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
                    <h3 className="text-lg font-semibold text-gray-900">Estado</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedRental.status)}`}>
                      {selectedRental.status.charAt(0).toUpperCase() + selectedRental.status.slice(1)}
                    </span>
                    <button
                      onClick={() => handleEditRental(selectedRental)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteRental(selectedRental.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 5a1 1 0 011 1v1h1a1 1 0 110 2H9v1a1 1 0 11-2 0V9H6a1 1 0 110-2h1V6a1 1 0 011-1z" />
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">Bicicletas</h3>
                </div>
                <div className="space-y-3">
                  {selectedRental.rental_items?.map((item) => (
                    <div key={item.id} className="bg-white p-3 rounded-lg flex justify-between items-center">
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
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900">Hora de Inicio</h3>
                  </div>
                  <p className="text-gray-600">{formatDateTime(selectedRental.start_date)}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900">Total</h3>
                  </div>
                  <p className="mt-1">{selectedRental.rental_items?.reduce((total, item) => 
                    total + ((item.rental_pricing?.price || 0) * item.quantity), 0
                  ).toFixed(2)}€</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rental Modal */}
      {editingRental && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">Editar Alquiler</h2>
              <button
                onClick={() => setEditingRental(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateRental} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Estado</label>
                <select
                  value={editingRental.status}
                  onChange={(e) => setEditingRental({...editingRental, status: e.target.value as Rental['status']})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="active">Activo</option>
                  <option value="completed">Completado</option>
                  <option value="canceled">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha de Inicio</label>
                <input
                  type="datetime-local"
                  value={editingRental.start_date.slice(0, 16)}
                  onChange={(e) => setEditingRental({...editingRental, start_date: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setEditingRental(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 