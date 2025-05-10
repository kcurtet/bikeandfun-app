'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { formatDateTime } from '@/utils/dateUtils';

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

// Status-related functions
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

export default function RepairsHistoryPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
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
        .in('status', ['canceled', 'delivered'])
        .order('repair_end', { ascending: false });

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Historial de Reparaciones</h1>
        <Link
          href="/repairs"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Volver a Reparaciones
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repairs.map((repair) => (
            <div 
              key={repair.id} 
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedRepair(repair)}
            >
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
                  <span className="font-medium">
                    {repair.delivery_date ? formatDateTime(repair.delivery_date) : 'Not set'}
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Repair Details Modal */}
      {selectedRepair && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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

            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {customers.find(c => c.id === selectedRepair.customer_id)?.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedRepair.bike_model}
                  </p>
                </div>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedRepair.status)}`}>
                  {selectedRepair.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Fecha de Inicio</h4>
                  <p className="mt-1">{formatDateTime(selectedRepair.repair_start)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Fecha de Fin</h4>
                  <p className="mt-1">{selectedRepair.repair_end ? formatDateTime(selectedRepair.repair_end) : 'No completada'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Fecha de Entrega Estimada</h4>
                  <p className="mt-1">{selectedRepair.delivery_date ? formatDateTime(selectedRepair.delivery_date) : 'No asignada'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Precio</h4>
                  <p className="mt-1">{selectedRepair.price.toFixed(2)}€</p>
                </div>
              </div>

              {selectedRepair.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Notas</h4>
                  <p className="mt-1 text-gray-700">{selectedRepair.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 