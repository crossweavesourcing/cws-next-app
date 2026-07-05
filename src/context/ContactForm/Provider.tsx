"use client"
import { useReducer } from "react";
import { JSX, ReactNode } from "react";
import reducer from "./Reducer";
import initialState from "./initialState";
import { FormData } from "./types";
import { submitForm as submitContactForm } from "./actions";

import Context from "./Context";

export function Provider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);

  function setField(field: keyof FormData, value: string) {
    dispatch({ type: 'SET_FIELD', payload: { field, value } });
  }

  function resetForm() {
    dispatch({ type: 'RESET_FORM' });
  }

  function clearStatus() {
    dispatch({ type: 'CLEAR_SUBMIT_STATUS' });
  }

  async function submitForm(): Promise<{ success: boolean; error?: string }> {
    dispatch({ type: 'SET_SUBMITTING' });

    try {
      const result = await submitContactForm(state.formData);
      
      if (result.success) {
        dispatch({ type: 'SET_SUBMIT_SUCCESS' });
        dispatch({ type: 'RESET_FORM_FIELDS' });
        return { success: true };
      } else {
        const errorMsg = result.error || 'Submission failed';
        dispatch({ type: 'SET_SUBMIT_ERROR', payload: errorMsg });
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      dispatch({ 
        type: 'SET_SUBMIT_ERROR', 
        payload: errorMsg
      });
      return { success: false, error: errorMsg };
    }
  }

  return (
    <Context.Provider value={{ state, setField, resetForm, submitForm, clearStatus }}>
      {children}
    </Context.Provider>
  );
}