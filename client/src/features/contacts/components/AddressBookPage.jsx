/**
 * NexVault — Address Book Page
 * Displays saved contacts and allows adding/removing them.
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineUserPlus, HiOutlineTrash, HiOutlineUserGroup } from 'react-icons/hi2';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { loadContacts, saveContact, deleteContact } from '../contactsSlice.js';
import { isAddress } from 'ethers';

export default function AddressBookPage() {
  const dispatch = useDispatch();
  const { items: contacts, isLoading } = useSelector((state) => state.contacts);

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    dispatch(loadContacts());
  }, [dispatch]);

  const handleAddContact = async (e) => {
    e.preventDefault();
    const currentErrors = {};

    if (!name.trim()) currentErrors.name = 'Name is required';
    if (!address.trim()) {
      currentErrors.address = 'Address is required';
    } else if (!isAddress(address)) {
      currentErrors.address = 'Invalid Ethereum address';
    } else if (contacts.some((c) => c.address.toLowerCase() === address.toLowerCase())) {
      currentErrors.address = 'Contact already exists';
    }

    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }

    await dispatch(saveContact({ name: name.trim(), address }));
    setName('');
    setAddress('');
    setShowAddForm(false);
    setErrors({});
  };

  const truncateAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  // Generate a random-looking avatar color for contacts
  const getAvatarColor = (addr) => {
    const hash = parseInt(addr.slice(2, 10), 16) || 0;
    return `hsl(${hash % 360}, 65%, 55%)`;
  };

  return (
    <div className="flex flex-col h-full px-4 py-4">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Address Book</h2>
          <p className="text-sm text-surface-400">Manage your saved contacts</p>
        </div>
        {!showAddForm && (
          <Button
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="!px-3"
          >
            <HiOutlineUserPlus className="w-4 h-4 mr-1.5" />
            Add
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showAddForm ? (
          <motion.form
            key="add-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddContact}
            className="space-y-4 mb-6 p-4 rounded-xl bg-surface-800/50 border border-surface-700/50"
          >
            <h3 className="text-sm font-semibold text-white">New Contact</h3>
            <Input
              label="Contact Name"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: null })); }}
              error={errors.name}
              placeholder="e.g. Alice"
              autoFocus
            />
            <Input
              label="Ethereum Address"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setErrors((p) => ({ ...p, address: null })); }}
              error={errors.address}
              placeholder="0x..."
            />
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAddForm(false);
                  setName('');
                  setAddress('');
                  setErrors({});
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" loading={isLoading}>
                Save Contact
              </Button>
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="contact-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto pr-1 custom-scrollbar"
          >
            {contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-surface-800 flex items-center justify-center mb-3">
                  <HiOutlineUserGroup className="w-6 h-6 text-surface-500" />
                </div>
                <p className="text-surface-300 font-medium mb-1">No contacts yet</p>
                <p className="text-sm text-surface-500 max-w-[200px]">
                  Add frequently used addresses to your address book.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center p-3 rounded-xl bg-surface-800/30 border border-surface-700/30 hover:bg-surface-800/60 transition-colors group"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ backgroundColor: getAvatarColor(contact.address) }}
                    >
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="text-sm font-semibold text-surface-200 truncate">
                        {contact.name}
                      </div>
                      <div className="text-xs text-surface-500 font-mono truncate">
                        {truncateAddress(contact.address)}
                      </div>
                    </div>
                    <button
                      onClick={() => dispatch(deleteContact(contact.id))}
                      className="p-2 text-surface-500 hover:text-danger-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-danger-500/10"
                      title="Delete contact"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
