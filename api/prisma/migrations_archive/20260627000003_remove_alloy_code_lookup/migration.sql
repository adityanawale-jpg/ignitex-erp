-- Migration 72: Remove ALLOY_CODE entries from master_lookup.
-- Standard Alloy and Customer Alloy now resolve from alloy_master
-- instead of master_lookup.

DELETE FROM master_lookup WHERE lookup_type = 'ALLOY_CODE';
