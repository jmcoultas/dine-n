
-- Modify temporary_recipes sequence
ALTER SEQUENCE temporary_recipes_id_seq
    INCREMENT BY 1
    MINVALUE 100000
    MAXVALUE 199999
    START WITH 100000
    RESTART;

-- Modify recipes sequence
ALTER SEQUENCE recipes_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 99999
    START WITH 1
    RESTART;
