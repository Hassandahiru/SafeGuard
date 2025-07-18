import React, { createContext, useContext, useReducer } from 'react';
import { visitorService } from '../services';

// Visitor state structure
const initialState = {
  visitors: [],
  selectedVisitor: null,
  isLoading: false,
  error: null,
  showNewVisitModal: false,
  filters: {
    status: null,
    dateFrom: null,
    dateTo: null,
    search: '',
  },
  meta: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  },
};

// Visitor actions
const VISITOR_ACTIONS = {
  LOAD_START: 'LOAD_START',
  LOAD_SUCCESS: 'LOAD_SUCCESS',
  LOAD_FAILURE: 'LOAD_FAILURE',
  CREATE_SUCCESS: 'CREATE_SUCCESS',
  UPDATE_SUCCESS: 'UPDATE_SUCCESS',
  DELETE_SUCCESS: 'DELETE_SUCCESS',
  SET_SELECTED: 'SET_SELECTED',
  SET_FILTERS: 'SET_FILTERS',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SHOW_NEW_VISIT_MODAL: 'SHOW_NEW_VISIT_MODAL',
  HIDE_NEW_VISIT_MODAL: 'HIDE_NEW_VISIT_MODAL',
};

// Visitor reducer
const visitorReducer = (state, action) => {
  switch (action.type) {
    case VISITOR_ACTIONS.LOAD_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case VISITOR_ACTIONS.LOAD_SUCCESS:
      return {
        ...state,
        visitors: action.payload.visitors,
        meta: action.payload.meta,
        isLoading: false,
        error: null,
      };
    case VISITOR_ACTIONS.LOAD_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case VISITOR_ACTIONS.CREATE_SUCCESS:
      return {
        ...state,
        visitors: [action.payload, ...state.visitors],
        meta: {
          ...state.meta,
          total: state.meta.total + 1,
        },
      };
    case VISITOR_ACTIONS.UPDATE_SUCCESS:
      return {
        ...state,
        visitors: state.visitors.map(visitor =>
          visitor.id === action.payload.id ? action.payload : visitor
        ),
        selectedVisitor: state.selectedVisitor?.id === action.payload.id 
          ? action.payload 
          : state.selectedVisitor,
      };
    case VISITOR_ACTIONS.DELETE_SUCCESS:
      return {
        ...state,
        visitors: state.visitors.filter(visitor => visitor.id !== action.payload),
        selectedVisitor: state.selectedVisitor?.id === action.payload 
          ? null 
          : state.selectedVisitor,
        meta: {
          ...state.meta,
          total: Math.max(0, state.meta.total - 1),
        },
      };
    case VISITOR_ACTIONS.SET_SELECTED:
      return {
        ...state,
        selectedVisitor: action.payload,
      };
    case VISITOR_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };
    case VISITOR_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    case VISITOR_ACTIONS.SHOW_NEW_VISIT_MODAL:
      return {
        ...state,
        showNewVisitModal: true,
      };
    case VISITOR_ACTIONS.HIDE_NEW_VISIT_MODAL:
      return {
        ...state,
        showNewVisitModal: false,
      };
    default:
      return state;
  }
};

// Create context
const VisitorContext = createContext();

// Visitor provider component
export const VisitorProvider = ({ children }) => {
  const [state, dispatch] = useReducer(visitorReducer, initialState);

  const loadVisitors = async (filters = {}) => {
    dispatch({ type: VISITOR_ACTIONS.LOAD_START });
    
    try {
      const response = await visitorService.getVisitors({
        ...state.filters,
        ...filters,
        page: state.meta.page,
        limit: state.meta.limit,
      });

      dispatch({
        type: VISITOR_ACTIONS.LOAD_SUCCESS,
        payload: response,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to load visitors';
      dispatch({
        type: VISITOR_ACTIONS.LOAD_FAILURE,
        payload: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  };

  const createVisitor = async (visitorData) => {
    try {
      const response = await visitorService.createInvitation(visitorData);
      
      dispatch({
        type: VISITOR_ACTIONS.CREATE_SUCCESS,
        payload: response.visitor,
      });

      return { success: true, data: response };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create visitor';
      return { success: false, error: errorMessage };
    }
  };

  const updateVisitor = async (visitorId, updateData) => {
    try {
      const response = await visitorService.updateVisitor(visitorId, updateData);
      
      dispatch({
        type: VISITOR_ACTIONS.UPDATE_SUCCESS,
        payload: response,
      });

      return { success: true, data: response };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update visitor';
      return { success: false, error: errorMessage };
    }
  };

  const deleteVisitor = async (visitorId) => {
    try {
      await visitorService.deleteVisitor(visitorId);
      
      dispatch({
        type: VISITOR_ACTIONS.DELETE_SUCCESS,
        payload: visitorId,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete visitor';
      return { success: false, error: errorMessage };
    }
  };

  const selectVisitor = (visitor) => {
    dispatch({
      type: VISITOR_ACTIONS.SET_SELECTED,
      payload: visitor,
    });
  };

  const setFilters = (filters) => {
    dispatch({
      type: VISITOR_ACTIONS.SET_FILTERS,
      payload: filters,
    });
  };

  const clearError = () => {
    dispatch({ type: VISITOR_ACTIONS.CLEAR_ERROR });
  };

  const openNewVisitModal = () => {
    dispatch({ type: VISITOR_ACTIONS.SHOW_NEW_VISIT_MODAL });
  };

  const closeNewVisitModal = () => {
    dispatch({ type: VISITOR_ACTIONS.HIDE_NEW_VISIT_MODAL });
  };

  const value = {
    ...state,
    loadVisitors,
    createVisitor,
    updateVisitor,
    deleteVisitor,
    selectVisitor,
    setFilters,
    clearError,
    openNewVisitModal,
    closeNewVisitModal,
  };

  return (
    <VisitorContext.Provider value={value}>
      {children}
    </VisitorContext.Provider>
  );
};

// Custom hook to use visitor context
export const useVisitor = () => {
  const context = useContext(VisitorContext);
  if (!context) {
    throw new Error('useVisitor must be used within a VisitorProvider');
  }
  return context;
};