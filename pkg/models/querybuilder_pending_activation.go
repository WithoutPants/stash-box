package models

import (
	"github.com/gofrs/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/stashapp/stashdb/pkg/database"
)

type PendingActivationFinder interface {
	FindByEmail(email string) (*PendingActivation, error)
	FindByKey(key string) (*PendingActivation, error)
}

type PendingActivationCreator interface {
	Create(newActivation PendingActivation) (*PendingActivation, error)
}

type PendingActivationQueryBuilder struct {
	dbi database.DBI
}

func NewPendingActivationQueryBuilder(tx *sqlx.Tx) PendingActivationQueryBuilder {
	return PendingActivationQueryBuilder{
		dbi: database.DBIWithTxn(tx),
	}
}

func (qb *PendingActivationQueryBuilder) toModel(ro interface{}) *PendingActivation {
	if ro != nil {
		return ro.(*PendingActivation)
	}

	return nil
}

func (qb *PendingActivationQueryBuilder) Create(newActivation PendingActivation) (*PendingActivation, error) {
	ret, err := qb.dbi.Insert(newActivation)
	return qb.toModel(ret), err
}

func (qb *PendingActivationQueryBuilder) Destroy(id uuid.UUID) error {
	return qb.dbi.Delete(id, pendingActivationDBTable)
}

func (qb *PendingActivationQueryBuilder) Find(id uuid.UUID) (*PendingActivation, error) {
	ret, err := qb.dbi.Find(id, pendingActivationDBTable)
	return qb.toModel(ret), err
}

func (qb *PendingActivationQueryBuilder) FindByEmail(email string) (*PendingActivation, error) {
	query := `SELECT * FROM ` + pendingActivationTable + ` WHERE email = ?`
	var args []interface{}
	args = append(args, email)
	output := PendingActivations{}
	err := qb.dbi.RawQuery(pendingActivationDBTable, query, args, &output)
	if err != nil {
		return nil, err
	}

	if len(output) > 0 {
		return output[0], nil
	}
	return nil, nil
}

func (qb *PendingActivationQueryBuilder) FindByKey(key string) (*PendingActivation, error) {
	query := `SELECT * FROM ` + pendingActivationTable + ` WHERE invite_key = ?`
	var args []interface{}
	args = append(args, key)
	output := PendingActivations{}
	err := qb.dbi.RawQuery(pendingActivationDBTable, query, args, &output)
	if err != nil {
		return nil, err
	}

	if len(output) > 0 {
		return output[0], nil
	}
	return nil, nil
}

func (qb *PendingActivationQueryBuilder) Count() (int, error) {
	return runCountQuery(buildCountQuery("SELECT "+pendingActivationTable+".id FROM "+pendingActivationTable), nil)
}
